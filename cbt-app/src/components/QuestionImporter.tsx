'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileSpreadsheet,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { bulkInsertQuestions } from '@/lib/queries';
import type { QuestionImportRow, BulkImportResult } from '@/types';

interface QuestionImporterProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function QuestionImporter({ onClose, onSuccess }: QuestionImporterProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState<QuestionImportRow[]>([]);
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
    const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
            alert('Hanya file Excel (.xlsx, .xls) atau CSV yang diizinkan');
            return;
        }

        setFile(selectedFile);
        parseExcelFile(selectedFile);
    };

    const parseExcelFile = async (file: File) => {
        setIsProcessing(true);
        setValidationErrors([]);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with header row
            const jsonData: QuestionImportRow[] = XLSX.utils.sheet_to_json(worksheet, {
                defval: ''
            });

            // Validate and show preview
            const errors: Array<{ row: number; error: string }> = [];
            const validatedData: QuestionImportRow[] = [];

            jsonData.forEach((row, idx) => {
                const rowNum = idx + 2; // +2 because Excel rows start at 1 and we have header

                // Validation
                if (!row.Pertanyaan || row.Pertanyaan.trim() === '') {
                    errors.push({ row: rowNum, error: 'Pertanyaan tidak boleh kosong' });
                    return;
                }

                if (!['SINGLE', 'COMPLEX', 'TRUE_FALSE_MULTI'].includes(row.Tipe)) {
                    errors.push({ row: rowNum, error: `Tipe soal tidak valid: ${row.Tipe}. Harus SINGLE, COMPLEX, atau TRUE_FALSE_MULTI` });
                    return;
                }

                // Validate options for SINGLE and COMPLEX
                if (row.Tipe !== 'TRUE_FALSE_MULTI') {
                    if (!row['Opsi A'] || !row['Opsi B']) {
                        errors.push({ row: rowNum, error: 'Minimal Opsi A dan B harus diisi' });
                        return;
                    }
                    if (!row.Kunci) {
                        errors.push({ row: rowNum, error: 'Kunci jawaban harus diisi' });
                        return;
                    }
                }

                // Validate TRUE_FALSE_MULTI
                if (row.Tipe === 'TRUE_FALSE_MULTI') {
                    if (!row.Pernyataan || row.Pernyataan.trim() === '') {
                        errors.push({ row: rowNum, error: 'Kolom Pernyataan harus diisi untuk tipe TRUE_FALSE_MULTI' });
                        return;
                    }
                    if (!row.Kunci) {
                        errors.push({ row: rowNum, error: 'Kunci jawaban (B/S) harus diisi' });
                        return;
                    }
                }

                validatedData.push(row);
            });

            setValidationErrors(errors);
            setPreviewData(validatedData.slice(0, 10)); // Show first 10 for preview
        } catch (error) {
            console.error('Parse error:', error);
            alert('Gagal membaca file Excel. Pastikan format file sudah benar.');
        } finally {
            setIsProcessing(false);
        }
    };

    const transformToDatabase = (rows: QuestionImportRow[]) => {
        return rows.map((row, idx) => {
            const baseQuestion = {
                nomor_urut: row.No || idx + 1,
                tipe: row.Tipe,
                pertanyaan: row.Pertanyaan,
                gambar_url: undefined, // Excel doesn't have image URLs currently
                bobot: row.Bobot || 1,
                kategori: row.Kategori || undefined,
                paket: row.Paket || undefined
            };

            // Build options JSONB
            const options: Record<string, string> = {};
            if (row.Tipe !== 'TRUE_FALSE_MULTI') {
                if (row['Opsi A']) options.a = row['Opsi A'];
                if (row['Opsi B']) options.b = row['Opsi B'];
                if (row['Opsi C']) options.c = row['Opsi C'];
                if (row['Opsi D']) options.d = row['Opsi D'];
                if (row['Opsi E']) options.e = row['Opsi E'];
            }

            // Build correct_answer_config JSONB based on type
            let correct_answer_config: any = {};

            if (row.Tipe === 'SINGLE') {
                // Format: {\"answer\": \"A\"}
                correct_answer_config = {
                    answer: row.Kunci.trim().toUpperCase()
                };
            } else if (row.Tipe === 'COMPLEX') {
                // Format: {\"answers\": [\"A\", \"C\", \"D\"]}
                const answers = row.Kunci
                    .split(',')
                    .map(k => k.trim().toUpperCase())
                    .filter(Boolean);
                correct_answer_config = {
                    answers
                };
            } else if (row.Tipe === 'TRUE_FALSE_MULTI') {
                // Pernyataan: semicolon-separated statements
                const statements = row.Pernyataan
                    ? row.Pernyataan.split(';').map(s => s.trim()).filter(Boolean)
                    : [];

                // Kunci: B,S,B,S where B = Benar (true), S = Salah (false)
                const answerKeys = row.Kunci.split(',').map(k => k.trim().toUpperCase());
                const answers = answerKeys.map(key => {
                    if (key === 'B') return true;  // Benar
                    if (key === 'S') return false; // Salah
                    return null;
                }).filter(val => val !== null) as boolean[];

                correct_answer_config = {
                    statements,
                    answers
                };
            }

            return {
                ...baseQuestion,
                options,
                correct_answer_config
            };
        });
    };

    const handleImport = async () => {
        if (validationErrors.length > 0) {
            alert('Perbaiki error validasi terlebih dahulu sebelum import');
            return;
        }

        if (previewData.length === 0) {
            alert('Tidak ada data valid untuk diimport');
            return;
        }

        setIsProcessing(true);

        try {
            // Parse entire file again (not just preview)
            const buffer = await file!.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const allData: QuestionImportRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            // Filter out invalid rows
            const validRows = allData.filter((row, idx) => {
                const rowNum = idx + 2;
                return !validationErrors.some(err => err.row === rowNum);
            });

            // Transform to database format
            const questionsToInsert = transformToDatabase(validRows);

            // Call bulk insert
            const result = await bulkInsertQuestions(questionsToInsert);

            setImportResult(result);

            if (result.success) {
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal melakukan import. Silakan coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Import Soal dari Excel</h2>
                            <p className="text-blue-100 text-sm">Upload file Excel untuk import soal massal</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-xl"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* File Upload Area */}
                    {!file && (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                const droppedFile = e.dataTransfer.files[0];
                                if (droppedFile) handleFileSelect(droppedFile);
                            }}
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${isDragOver
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                                }`}
                        >
                            <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">
                                Drop file Excel di sini atau klik untuk browse
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Format: .xlsx, .xls, atau .csv (maksimal 10MB)
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) handleFileSelect(selectedFile);
                                }}
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Pilih File
                            </Button>

                            {/* Format Info */}
                            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Format Excel yang Diperlukan
                                </h4>
                                <p className="text-sm text-amber-800 text-left">
                                    Kolom wajib: <code className="bg-amber-100 px-1 rounded">No, Pertanyaan, Tipe, Opsi A, Opsi B, Opsi C, Opsi D, Opsi E, Kunci, Bobot</code>
                                    <br />
                                    Kolom opsional: <code className="bg-amber-100 px-1 rounded">Kategori, Paket, Pernyataan</code>
                                    <br /><br />
                                    <strong>Catatan untuk TRUE_FALSE_MULTI:</strong>
                                    <br />• Gunakan kolom <code className="bg-amber-100 px-1 rounded">Pernyataan</code> dengan pemisah titik koma (;)
                                    <br />• Kunci jawaban: B = Benar, S = Salah. Contoh: <code className="bg-amber-100 px-1 rounded">B,S,B,S</code>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Preview and Validation */}
                    {file && !importResult && (
                        <div className="space-y-6">
                            {/* File Info */}
                            <Card className="p-4 bg-slate-50 border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                                        <div>
                                            <p className="font-semibold text-slate-800">{file.name}</p>
                                            <p className="text-sm text-slate-500">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFile(null);
                                            setPreviewData([]);
                                            setValidationErrors([]);
                                        }}
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Remove
                                    </Button>
                                </div>
                            </Card>

                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                                <Card className="p-4 bg-red-50 border-red-200">
                                    <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        Error Validasi ({validationErrors.length})
                                    </h4>
                                    <div className="space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto">
                                        {validationErrors.map((err, idx) => (
                                            <p key={idx}>
                                                <strong>Baris {err.row}:</strong> {err.error}
                                            </p>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Preview Table */}
                            {previewData.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-slate-800">
                                            Preview Data (10 pertama dari {previewData.length} soal)
                                        </h3>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                            {validationErrors.length === 0 ? 'Siap Import' : 'Ada Error'}
                                        </Badge>
                                    </div>

                                    <div className="border rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-100">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">No</th>
                                                        <th className="px-4 py-3 text-left">Pertanyaan</th>
                                                        <th className="px-4 py-3 text-left">Tipe</th>
                                                        <th className="px-4 py-3 text-left">Kunci</th>
                                                        <th className="px-4 py-3 text-left">Bobot</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewData.map((row, idx) => (
                                                        <tr key={idx} className="border-t hover:bg-slate-50">
                                                            <td className="px-4 py-3">{row.No}</td>
                                                            <td className="px-4 py-3">
                                                                {row.Pertanyaan.substring(0, 50)}...
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Badge>{row.Tipe}</Badge>
                                                            </td>
                                                            <td className="px-4 py-3">{row.Kunci}</td>
                                                            <td className="px-4 py-3">{row.Bobot}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setFile(null);
                                        setPreviewData([]);
                                        setValidationErrors([]);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={isProcessing || validationErrors.length > 0 || previewData.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Mengimport...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Import {previewData.length} Soal
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <div className="text-center py-12">
                            {importResult.success ? (
                                <>
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                                        Import Berhasil!
                                    </h3>
                                    <p className="text-green-700">
                                        {importResult.successCount} soal berhasil ditambahkan ke database
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="w-12 h-12 text-red-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                                        Import Gagal
                                    </h3>
                                    <div className="text-red-700 space-y-1">
                                        {importResult.errors.map((err, idx) => (
                                            <p key={idx}>
                                                {err.row > 0 ? `Baris ${err.row}: ` : ''}{err.error}
                                            </p>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
