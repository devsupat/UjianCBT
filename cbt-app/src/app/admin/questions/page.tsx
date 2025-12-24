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
    Image as ImageIcon,
    Check,
    Package
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '@/lib/api';
import type { Question } from '@/types';
import { truncate } from '@/lib/utils';
import TrueFalseMultiEditor from '@/components/TrueFalseMultiEditor';

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
        tipe: 'SINGLE' as 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI',
        pertanyaan: '',
        gambar_url: '',
        opsi_a: '',
        opsi_b: '',
        opsi_c: '',
        opsi_d: '',
        opsi_e: '',
        kunci_jawaban: '',
        bobot: 1,
        kategori: '',
        paket: '',
        // TRUE_FALSE_MULTI specific fields
        statements_json: [''] as string[],
        answer_json: [true] as boolean[]
    });

    // Available package options for question assignment
    const paketOptions = [
        { value: '', label: 'Tanpa Paket' },
        { value: 'Paket1', label: 'Paket 1' },
        { value: 'Paket2', label: 'Paket 2' },
        { value: 'Paket3', label: 'Paket 3' },
        { value: 'Paket4', label: 'Paket 4' },
        { value: 'Paket5', label: 'Paket 5' },
    ];

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
            kategori: '',
            paket: '',
            statements_json: [''],
            answer_json: [true]
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
                kategori: question.kategori || '',
                paket: (question as any).paket || '',
                statements_json: question.statements_json || [''],
                answer_json: question.answer_json || [true]
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

        // Validation for SINGLE and COMPLEX - require options and answer key
        if (formData.tipe !== 'TRUE_FALSE_MULTI') {
            if (!formData.opsi_a.trim() || !formData.opsi_b.trim()) {
                alert('Minimal opsi A dan B harus diisi');
                return;
            }
            if (!formData.kunci_jawaban) {
                alert('Kunci jawaban harus dipilih');
                return;
            }
        } else {
            // Validation for TRUE_FALSE_MULTI - require at least one non-empty statement
            const hasValidStatement = formData.statements_json.some(s => s.trim() !== '');
            if (!hasValidStatement) {
                alert('Minimal satu pernyataan harus diisi');
                return;
            }
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
                            className="bg-gradient-to-br from-white via-white to-slate-50 rounded-3xl w-full max-w-6xl mx-4 shadow-[0_25px_80px_-12px_rgba(0,0,0,0.25)] ring-1 ring-white/80"
                        >
                            {/* --- HEADER --- */}
                            <div className="relative overflow-hidden px-8 md:px-12 py-8 border-b border-slate-100">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent"></div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                                            {editingQuestion ? 'Edit Soal' : 'Tambah Soal Baru'}
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {editingQuestion ? 'Ubah detail dan konten soal terpilih' : 'Buat soal baru untuk bank soal ujian'}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleCloseModal} className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* --- FORM BODY --- */}
                            <form onSubmit={handleSubmit} className="px-8 md:px-12 py-8 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-8 items-start">

                                    {/* LEFT COLUMN: INFORMATION & CONTENT */}
                                    <div className="space-y-6">
                                        {/* SECTION 1: Informasi Soal */}
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full"></div>
                                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Informasi Soal</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Soal</label>
                                                    <Input
                                                        value={formData.id_soal}
                                                        onChange={(e) => setFormData({ ...formData, id_soal: e.target.value })}
                                                        disabled={!!editingQuestion}
                                                        placeholder="Q-001"
                                                        className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm font-semibold transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nomor Urut</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.nomor_urut}
                                                        onChange={(e) => setFormData({ ...formData, nomor_urut: parseInt(e.target.value) || 1 })}
                                                        className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm font-semibold transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe Soal</label>
                                                    <div className="relative">
                                                        <select
                                                            className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                                            value={formData.tipe}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                tipe: e.target.value as 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI',
                                                                kunci_jawaban: '',
                                                                statements_json: e.target.value === 'TRUE_FALSE_MULTI' ? [''] : formData.statements_json,
                                                                answer_json: e.target.value === 'TRUE_FALSE_MULTI' ? [true] : formData.answer_json
                                                            })}
                                                        >
                                                            <option value="SINGLE">Pilihan Ganda</option>
                                                            <option value="COMPLEX">Ganda Kompleks</option>
                                                            <option value="TRUE_FALSE_MULTI">Benar / Salah</option>
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <Plus className="w-4 h-4 rotate-45" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Package className="w-3.5 h-3.5 text-indigo-500" />
                                                        Paket Soal
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            className="w-full h-12 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                                            value={formData.paket}
                                                            onChange={(e) => setFormData({ ...formData, paket: e.target.value })}
                                                        >
                                                            {paketOptions.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                                            <Plus className="w-4 h-4 rotate-45" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 2: Isi Pertanyaan */}
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Isi Pertanyaan</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Narasi / Pertanyaan Utama</label>
                                                    <textarea
                                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm min-h-[200px] leading-relaxed font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all resize-y placeholder:text-slate-400"
                                                        value={formData.pertanyaan}
                                                        onChange={(e) => setFormData({ ...formData, pertanyaan: e.target.value })}
                                                        placeholder="Tuliskan pertanyaan lengkap di sini..."
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                        URL Gambar Pendukung <span className="text-slate-400 font-normal normal-case">(opsional)</span>
                                                    </label>
                                                    <div className="relative group">
                                                        <Input
                                                            value={formData.gambar_url}
                                                            onChange={(e) => setFormData({ ...formData, gambar_url: e.target.value })}
                                                            placeholder="https://drive.google.com/..."
                                                            className="h-12 px-4 pr-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm transition-all"
                                                        />
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                                                            <ImageIcon className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: ANSWERS & SETTINGS */}
                                    <div className="space-y-6">
                                        {/* SECTION 3: Jawaban Kunci */}
                                        {formData.tipe === 'TRUE_FALSE_MULTI' ? (
                                            <TrueFalseMultiEditor
                                                statements={formData.statements_json}
                                                answers={formData.answer_json}
                                                onStatementsChange={(statements) => setFormData(prev => ({ ...prev, statements_json: statements }))}
                                                onAnswersChange={(answers) => setFormData(prev => ({ ...prev, answer_json: answers }))}
                                            />
                                        ) : (
                                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
                                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Jawaban Kunci</h3>
                                                </div>
                                                <div className="space-y-3">
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
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${isKey
                                                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                                                        }`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                                <Input
                                                                    value={formData[key] as string}
                                                                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                                    placeholder={`Opsi ${opt}...`}
                                                                    className={`h-10 px-4 text-sm bg-slate-50 focus:bg-white transition-all rounded-xl border ${isKey
                                                                        ? 'border-emerald-300 ring-2 ring-emerald-100'
                                                                        : 'border-slate-200 focus:border-emerald-400'
                                                                        }`}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                                                        <Check className="w-4 h-4 text-emerald-500" />
                                                        <span>Klik huruf untuk memilih kunci jawaban</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* SECTION 4: Pengaturan */}
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-1.5 h-6 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full"></div>
                                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Pengaturan</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bobot Skor</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.bobot}
                                                        onChange={(e) => setFormData({ ...formData, bobot: parseInt(e.target.value) || 1 })}
                                                        className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm font-semibold transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</label>
                                                    <Input
                                                        value={formData.kategori}
                                                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                                        placeholder="Numerasi"
                                                        className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm font-semibold transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- FOOTER --- */}
                                <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleCloseModal}
                                        className="h-11 px-6 rounded-xl font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all text-sm"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="h-11 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {editingQuestion ? 'Perbarui Soal' : 'Simpan Soal'}
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
