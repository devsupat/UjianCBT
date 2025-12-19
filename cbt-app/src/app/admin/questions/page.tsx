'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Pencil,
    Trash2,
    FileQuestion,
    Loader2,
    X,
    Save,
    Image as ImageIcon
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '@/lib/api';
import type { Question } from '@/types';
import { truncate } from '@/lib/utils';

interface QuestionWithKey extends Question {
    kunci_jawaban?: string;
}

export default function QuestionsManagement() {
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionWithKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        id_soal: '',
        nomor_urut: 1,
        tipe: 'SINGLE' as 'SINGLE' | 'COMPLEX',
        pertanyaan: '',
        gambar_url: '',
        opsi_a: '',
        opsi_b: '',
        opsi_c: '',
        opsi_d: '',
        opsi_e: '',
        kunci_jawaban: '',
        bobot: 1,
        kategori: ''
    });

    const { data, isLoading, mutate } = useSWR<{ success: boolean; data?: Question[] }>(
        'adminQuestions',
        getQuestions
    );

    const questions = data?.data || [];

    const resetForm = () => {
        setFormData({
            id_soal: `Q${String(questions.length + 1).padStart(3, '0')}`,
            nomor_urut: questions.length + 1,
            tipe: 'SINGLE',
            pertanyaan: '',
            gambar_url: '',
            opsi_a: '',
            opsi_b: '',
            opsi_c: '',
            opsi_d: '',
            opsi_e: '',
            kunci_jawaban: '',
            bobot: 1,
            kategori: ''
        });
        setEditingQuestion(null);
    };

    const handleOpenModal = (question?: QuestionWithKey) => {
        if (question) {
            setEditingQuestion(question);
            setFormData({
                id_soal: question.id_soal,
                nomor_urut: question.nomor_urut,
                tipe: question.tipe,
                pertanyaan: question.pertanyaan,
                gambar_url: question.gambar_url || '',
                opsi_a: question.opsi_a,
                opsi_b: question.opsi_b,
                opsi_c: question.opsi_c,
                opsi_d: question.opsi_d,
                opsi_e: question.opsi_e || '',
                kunci_jawaban: question.kunci_jawaban || '',
                bobot: question.bobot,
                kategori: question.kategori || ''
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.pertanyaan.trim()) {
            alert('Pertanyaan harus diisi');
            return;
        }
        if (!formData.opsi_a.trim() || !formData.opsi_b.trim()) {
            alert('Minimal opsi A dan B harus diisi');
            return;
        }
        if (!formData.kunci_jawaban) {
            alert('Kunci jawaban harus dipilih');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingQuestion) {
                await updateQuestion(editingQuestion.id_soal, formData);
            } else {
                await createQuestion(formData);
            }

            mutate();
            handleCloseModal();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Gagal menyimpan soal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id_soal: string) => {
        if (!confirm('Yakin hapus soal ini? Tidak bisa di-undo.')) return;

        try {
            await deleteQuestion(id_soal);
            mutate();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Gagal menghapus soal');
        }
    };

    const handleKeySelection = (key: string) => {
        if (formData.tipe === 'COMPLEX') {
            const current = formData.kunci_jawaban.split(',').filter(k => k);
            const newKeys = current.includes(key)
                ? current.filter(k => k !== key)
                : [...current, key];
            setFormData({ ...formData, kunci_jawaban: newKeys.join(',') });
        } else {
            setFormData({ ...formData, kunci_jawaban: key });
        }
    };

    const headerActions = (
        <Button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 border-0"
        >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Soal
        </Button>
    );

    return (
        <AdminLayout
            title="Kelola Soal"
            subtitle="Manajemen bank soal ujian"
            headerActions={headerActions}
        >
            <Card className="overflow-hidden shadow-xl ring-1 ring-slate-200/50 rounded-2xl border-0 lg:ml-8">
                <div className="bg-gradient-to-r from-emerald-50/50 to-white px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Bank Soal</h2>
                        <p className="text-sm text-slate-500">Manajemen dan pengaturan soal ujian</p>
                    </div>
                    <Badge variant="outline" className="bg-white px-4 py-2 text-slate-700 border-slate-200 shadow-sm font-semibold">
                        {questions.length} Soal
                    </Badge>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-24 text-slate-500">
                            <div className="w-20 h-20 mx-auto mb-6 p-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <FileQuestion className="w-10 h-10 opacity-40" />
                            </div>
                            <p className="text-lg font-medium text-slate-600 mb-2">Belum ada soal</p>
                            <p className="text-sm text-slate-400 mb-6">Mulai dengan menambahkan soal pertama</p>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30"
                                onClick={() => handleOpenModal()}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Soal Pertama
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">No</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Pertanyaan</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Tipe</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Bobot</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Gambar</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {questions.map((question) => (
                                    <tr key={question.id_soal} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-5 font-mono text-slate-600 font-semibold">
                                            {question.nomor_urut}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-medium text-slate-800 group-hover:text-emerald-600 transition-colors">{truncate(question.pertanyaan, 60)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <Badge variant={question.tipe === 'COMPLEX' ? 'warning' : 'default'} className="shadow-sm">
                                                {question.tipe}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5 text-center text-slate-700 font-semibold">{question.bobot}</td>
                                        <td className="px-8 py-5 text-center">
                                            {question.gambar_url ? (
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50">
                                                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenModal(question as QuestionWithKey)}
                                                    className="h-9 w-9 hover:bg-blue-50 hover:text-blue-700 rounded-lg"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(question.id_soal)}
                                                    className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-10"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white border-0 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl ring-1 ring-slate-200/50"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {editingQuestion ? 'Edit Soal' : 'Tambah Soal Baru'}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {editingQuestion ? 'Ubah detail soal yang dipilih' : 'Buat soal baru untuk bank soal'}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleCloseModal} className="h-9 w-9 rounded-lg hover:bg-slate-100">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-0">
                                {/* === SECTION 1: Informasi Soal === */}
                                <div className="pb-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                                        <h3 className="text-sm font-semibold text-slate-700">Informasi Soal</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">ID Soal</label>
                                            <Input
                                                value={formData.id_soal}
                                                onChange={(e) => setFormData({ ...formData, id_soal: e.target.value })}
                                                disabled={!!editingQuestion}
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">Nomor Urut</label>
                                            <Input
                                                type="number"
                                                value={formData.nomor_urut}
                                                onChange={(e) => setFormData({ ...formData, nomor_urut: parseInt(e.target.value) || 1 })}
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">Tipe</label>
                                            <select
                                                className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
                                                value={formData.tipe}
                                                onChange={(e) => setFormData({ ...formData, tipe: e.target.value as 'SINGLE' | 'COMPLEX', kunci_jawaban: '' })}
                                            >
                                                <option value="SINGLE">Pilihan Ganda</option>
                                                <option value="COMPLEX">Pilihan Ganda Kompleks</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* === SECTION 2: Isi Pertanyaan === */}
                                <div className="py-5 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                        <h3 className="text-sm font-semibold text-slate-700">Isi Pertanyaan</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">Pertanyaan</label>
                                            <textarea
                                                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm min-h-[120px] leading-relaxed focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all resize-y"
                                                style={{ fontSize: '14px', lineHeight: '1.6' }}
                                                value={formData.pertanyaan}
                                                onChange={(e) => setFormData({ ...formData, pertanyaan: e.target.value })}
                                                placeholder="Contoh: Ibukota Indonesia adalah ..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">
                                                URL Gambar <span className="text-slate-400 font-normal">(opsional)</span>
                                            </label>
                                            <Input
                                                value={formData.gambar_url}
                                                onChange={(e) => setFormData({ ...formData, gambar_url: e.target.value })}
                                                placeholder="https://drive.google.com/file/d/..."
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                                            />
                                            <p className="text-xs text-slate-400">
                                                Gunakan jika soal memerlukan gambar (diagram, peta, dll)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* === SECTION 3: Opsi Jawaban & Kunci === */}
                                <div className="py-5 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                        <h3 className="text-sm font-semibold text-slate-700">Opsi Jawaban & Kunci</h3>
                                    </div>
                                    <div className="space-y-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                                        {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                                            const key = `opsi_${opt.toLowerCase()}` as keyof typeof formData;
                                            const isKey = formData.tipe === 'COMPLEX'
                                                ? formData.kunci_jawaban.split(',').includes(opt)
                                                : formData.kunci_jawaban === opt;

                                            return (
                                                <div key={opt} className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleKeySelection(opt)}
                                                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all shadow-sm flex-shrink-0 ${isKey
                                                            ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-300'
                                                            : 'bg-white text-slate-500 hover:bg-slate-100 border-2 border-slate-200'
                                                            }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                    <div className="flex-1 relative">
                                                        <Input
                                                            value={formData[key] as string}
                                                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                            placeholder={`Opsi ${opt}${opt === 'E' ? ' (opsional)' : ''}`}
                                                            className={`h-10 text-sm bg-white focus:bg-white transition-all ${isKey
                                                                ? 'border-emerald-400 ring-1 ring-emerald-200'
                                                                : 'border-slate-200'
                                                                }`}
                                                        />
                                                        {isKey && (
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 flex items-center gap-1">
                                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                Kunci
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
                                            <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded text-[10px] font-bold">A</span>
                                            <span>Klik huruf untuk memilih kunci jawaban.{formData.tipe === 'COMPLEX' && ' Bisa pilih lebih dari satu.'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* === SECTION 4: Pengaturan Soal === */}
                                <div className="py-5 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                                        <h3 className="text-sm font-semibold text-slate-700">Pengaturan Soal</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">Bobot</label>
                                            <Input
                                                type="number"
                                                value={formData.bobot}
                                                onChange={(e) => setFormData({ ...formData, bobot: parseInt(e.target.value) || 1 })}
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                                            />
                                            <p className="text-xs text-slate-400">Nilai soal (default 1)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 block">
                                                Kategori <span className="text-slate-400 font-normal">(opsional)</span>
                                            </label>
                                            <Input
                                                value={formData.kategori}
                                                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                                placeholder="Contoh: Matematika"
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* === Submit Buttons === */}
                                <div className="flex gap-3 pt-5 border-t border-slate-200">
                                    <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleCloseModal}>
                                        Batal
                                    </Button>
                                    <Button type="submit" className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan Soal
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminLayout>
    );
}
