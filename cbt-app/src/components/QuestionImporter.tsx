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
    Download,
    FileText,
    Check,
    Trash2
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
            const dataSheetName = workbook.SheetNames.find(name =>
                name.toUpperCase() === 'DATA_SOAL'
            ) || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[dataSheetName];
            const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            const jsonData: QuestionImportRow[] = rawData.map(row => {
                const normalized: any = {};
                Object.keys(row).forEach(key => {
                    if (key.toLowerCase() === 'kategori') normalized['Kategori'] = row[key];
                    else normalized[key] = row[key];
                });
                return normalized as QuestionImportRow;
            });

            const errors: Array<{ row: number; error: string }> = [];
            const validatedData: QuestionImportRow[] = [];
            jsonData.forEach((row, idx) => {
                const rowNum = idx + 2;
                if (!row.Pertanyaan || row.Pertanyaan.trim() === '') {
                    errors.push({ row: rowNum, error: 'Pertanyaan kosong' });
                    return;
                }
                if (!['SINGLE', 'COMPLEX', 'TRUE_FALSE_MULTI'].includes(row.Tipe)) {
                    errors.push({ row: rowNum, error: `Tipe invalid: ${row.Tipe}` });
                    return;
                }
                validatedData.push(row);
            });
            setValidationErrors(errors);
            setPreviewData(validatedData.slice(0, 10));
        } catch (error) {
            console.error('Parse error:', error);
            alert('Format file tidak didukung.');
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
                bobot: row.Bobot || 1,
                kategori: row.Kategori || undefined,
                paket: row.Paket || undefined
            };
            const options: Record<string, string> = {};
            if (row.Tipe !== 'TRUE_FALSE_MULTI') {
                if (row['Opsi A']) options.a = row['Opsi A'];
                if (row['Opsi B']) options.b = row['Opsi B'];
                if (row['Opsi C']) options.c = row['Opsi C'];
                if (row['Opsi D']) options.d = row['Opsi D'];
                if (row['Opsi E']) options.e = row['Opsi E'];
            }
            let correct_answer_config: any = {};
            if (row.Tipe === 'SINGLE') {
                correct_answer_config = { answer: row.Kunci?.trim().toUpperCase() || 'A' };
            } else if (row.Tipe === 'COMPLEX') {
                correct_answer_config = { answers: row.Kunci?.split(',').map(k => k.trim().toUpperCase()).filter(Boolean) || [] };
            } else if (row.Tipe === 'TRUE_FALSE_MULTI') {
                const statements = row.Pernyataan ? row.Pernyataan.split(';').map(s => s.trim()).filter(Boolean) : [];
                const answers = row.Kunci?.split(',').map(k => k.trim().toUpperCase()).map(key => key === 'B') || [];
                correct_answer_config = { statements, answers };
            }
            return { ...baseQuestion, options, correct_answer_config };
        });
    };

    // Helper function to normalize Excel column names
    const normalizeRow = (row: Record<string, any>): QuestionImportRow => {
        const normalized: any = {};
        Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase().trim();
            // Map common variations of column names
            if (lowerKey === 'no' || lowerKey === 'nomor') normalized['No'] = row[key];
            else if (lowerKey === 'tipe' || lowerKey === 'type') normalized['Tipe'] = row[key]?.toString().toUpperCase().trim();
            else if (lowerKey === 'pertanyaan' || lowerKey === 'soal' || lowerKey === 'question') normalized['Pertanyaan'] = row[key];
            else if (lowerKey === 'opsi a' || lowerKey === 'opsi_a' || lowerKey === 'a') normalized['Opsi A'] = row[key];
            else if (lowerKey === 'opsi b' || lowerKey === 'opsi_b' || lowerKey === 'b') normalized['Opsi B'] = row[key];
            else if (lowerKey === 'opsi c' || lowerKey === 'opsi_c' || lowerKey === 'c') normalized['Opsi C'] = row[key];
            else if (lowerKey === 'opsi d' || lowerKey === 'opsi_d' || lowerKey === 'd') normalized['Opsi D'] = row[key];
            else if (lowerKey === 'opsi e' || lowerKey === 'opsi_e' || lowerKey === 'e') normalized['Opsi E'] = row[key];
            else if (lowerKey === 'kunci' || lowerKey === 'jawaban' || lowerKey === 'answer') normalized['Kunci'] = row[key]?.toString();
            else if (lowerKey === 'bobot' || lowerKey === 'skor' || lowerKey === 'score') normalized['Bobot'] = parseInt(row[key]) || 1;
            else if (lowerKey === 'kategori' || lowerKey === 'category') normalized['Kategori'] = row[key];
            else if (lowerKey === 'paket' || lowerKey === 'package') normalized['Paket'] = row[key];
            else if (lowerKey === 'pernyataan' || lowerKey === 'statements') normalized['Pernyataan'] = row[key];
            else normalized[key] = row[key];
        });
        return normalized as QuestionImportRow;
    };

    const handleImport = async () => {
        if (!file || isProcessing) return;
        setIsProcessing(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const dataSheetName = workbook.SheetNames.find(name =>
                name.toUpperCase() === 'DATA_SOAL'
            ) || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[dataSheetName];
            const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            // DEBUG: Log raw data from Excel
            console.log('📊 Raw Excel Data:', rawData);
            console.log('📊 Sheet name used:', dataSheetName);

            // Normalize all rows to expected column names
            const allData: QuestionImportRow[] = rawData.map(row => normalizeRow(row));

            // DEBUG: Log normalized data
            console.log('🔄 Normalized Data:', allData);

            // Filter out rows with validation errors and rows without required fields
            const validRows = allData.filter((row, idx) => {
                const rowNum = idx + 2;
                // Skip if this row had validation errors
                if (validationErrors.some(err => err.row === rowNum)) return false;
                // Skip if missing required fields
                if (!row.Tipe || !row.Pertanyaan) {
                    console.log(`⚠️ Row ${rowNum} skipped: Tipe=${row.Tipe}, Pertanyaan=${row.Pertanyaan?.substring(0, 50)}`);
                    return false;
                }
                return true;
            });

            // DEBUG: Log valid rows
            console.log('✅ Valid Rows:', validRows.length, validRows);

            if (validRows.length === 0) {
                alert('Tidak ada data valid untuk diimport. Pastikan kolom Tipe dan Pertanyaan terisi.');
                setIsProcessing(false);
                return;
            }

            const questionsToInsert = transformToDatabase(validRows);
            const result = await bulkInsertQuestions(questionsToInsert);
            setImportResult(result);
            if (result.success) {
                setTimeout(() => { onSuccess(); onClose(); }, 2000);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal mengimport soal.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-[85vw] max-w-[700px] max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Import Soal Massal</h2>
                            <p className="text-base text-gray-500 mt-1">Unggah berkas Excel untuk menambahkan banyak soal sekaligus.</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content Section - Spacious padding */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '32px 40px' }}>
                    <AnimatePresence mode="wait">
                        {!file && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="space-y-6"
                            >
                                {/* Upload Area - Larger and more prominent */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                                    className={`relative group border-2 border-dashed rounded-2xl text-center transition-all duration-300 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50'}`}
                                    style={{ padding: '40px', minHeight: '200px' }}
                                >
                                    {/* Large Upload Icon - 80x80px */}
                                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md border border-gray-200 group-hover:scale-110 transition-transform">
                                        <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    </div>

                                    {/* Larger Text - 18px */}
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Tarik & Lepas File Excel</h3>
                                    <p className="text-gray-500 text-base mb-6">Atau cari file dari perangkat Anda (.xlsx, .xls, .csv)</p>

                                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

                                    {/* Larger Button - 12px 32px padding, 16px font, 180px min-width */}
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-12 px-8 min-w-[180px] bg-slate-900 hover:bg-slate-800 text-white text-base font-semibold rounded-xl shadow-lg transition-all"
                                    >
                                        Pilih File Excel
                                    </Button>
                                </div>

                                {/* Format Guidelines - Spacious 2-column layout */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl" style={{ padding: '20px 24px' }}>
                                    <div className="flex gap-4 mb-4">
                                        {/* Larger Warning Icon */}
                                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-200">
                                            <AlertCircle className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Ketentuan Format Kolom</h4>
                                        </div>
                                    </div>

                                    {/* 2-Column Grid for Format Requirements */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="text-amber-900">
                                                <strong>Wajib:</strong> Pertanyaan, Tipe, Opsi A-B, Kunci
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="text-amber-900">
                                                <strong>Tipe:</strong> SINGLE, COMPLEX, TRUE_FALSE_MULTI
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="text-amber-900">
                                                <strong>Multi-Kunci:</strong> Pisahkan dengan koma (A,C,D)
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="text-amber-900">
                                                <strong>Pernyataan T/F:</strong> Pisahkan dengan titik koma (;)
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="text-amber-900">
                                                <strong>Opsional:</strong> No, Bobot, Kategori, Paket
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="text-amber-900">
                                                <strong>Sheet:</strong> Gunakan nama "DATA_SOAL"
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {file && !importResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[1.5rem] text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-bold">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold tracking-tight">{file.name}</p>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB • Siap Diproses</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => { setFile(null); setPreviewData([]); setValidationErrors([]); }} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold">Ganti File</Button>
                                </div>

                                {validationErrors.length > 0 && (
                                    <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                                        <h4 className="text-sm font-black text-red-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {validationErrors.length} Kesalahan Ditemukan
                                        </h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-4">
                                            {validationErrors.map((err, idx) => (
                                                <div key={idx} className="flex gap-2 text-xs font-bold text-red-600/80 bg-white p-2 rounded-lg border border-red-50 shadow-sm">
                                                    <span className="text-red-300">#Baris {err.row}:</span> {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Preview Data Ujian</h3>
                                        <Badge variant="outline" className="rounded-lg border-slate-200 font-bold px-3 py-1">{previewData.length} Baris Pertama</Badge>
                                    </div>
                                    <div className="border border-slate-100 rounded-[1.5rem] overflow-hidden bg-white shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Butir Pertanyaan Preview</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipe</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Kunci</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {previewData.map((row, idx) => (
                                                        <tr key={idx} className="h-14">
                                                            <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{row.No}</td>
                                                            <td className="px-6 py-4 font-bold text-slate-800 truncate max-w-[400px]">{row.Pertanyaan}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px] uppercase tracking-widest">{row.Tipe}</Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-mono font-bold text-indigo-600">{row.Kunci}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 mt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                                    <Button variant="ghost" className="w-full sm:w-auto px-8 text-slate-500 font-semibold" onClick={onClose}>Batal</Button>
                                    <Button
                                        onClick={handleImport}
                                        disabled={isProcessing || validationErrors.length > 0 || previewData.length === 0}
                                        className="w-full sm:w-auto px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-200/50 transition-all"
                                    >
                                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Mulai Import Massal
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {importResult && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 space-y-6">
                                {importResult.success ? (
                                    <>
                                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100/50 scale-110">
                                            <CheckCircle2 className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Sinkronisasi Berhasil!</h3>
                                        <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed"><span className="font-black text-emerald-600">{importResult.successCount} soal</span> telah dipublikasikan ke dalam sistem bank soal.</p>
                                        <div className="pt-8">
                                            <Button onClick={() => { onSuccess(); onClose(); }} className="h-12 px-12 bg-slate-900 text-white font-black rounded-2xl shadow-xl">Kembali ke Dashboard</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-100/50">
                                            <AlertCircle className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Import Terganggu</h3>
                                        <div className="max-w-md mx-auto space-y-2 mt-4">
                                            {importResult.errors.map((err, idx) => (
                                                <p key={idx} className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{err.error}</p>
                                            ))}
                                        </div>
                                        <Button onClick={() => setImportResult(null)} className="mt-8 h-12 px-12 border-slate-200 border-2 font-black rounded-2xl text-slate-600">Coba Lagi</Button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
