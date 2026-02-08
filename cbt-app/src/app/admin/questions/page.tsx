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
    Package,
    Upload,
    Search,
    FileText,
    CheckCircle2,
    Hash,
    ChevronRight,
    SearchX,
    AlertTriangle
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createQuestion, updateQuestion, deleteQuestion, fetchQuestions } from '@/lib/queries';
import type { Question } from '@/types';
import { truncate } from '@/lib/utils';
import TrueFalseMultiEditor from '@/components/TrueFalseMultiEditor';
import QuestionImporter from '@/components/QuestionImporter';

interface QuestionWithKey extends Question {
    kunci_jawaban?: string;
}

export default function QuestionsManagement() {
    const [showModal, setShowModal] = useState(false);
    const [showImporter, setShowImporter] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionWithKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Delete confirmation state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
        statements_json: [''] as string[],
        answer_json: [true] as boolean[]
    });

    const { data: questions = [], isLoading, mutate } = useSWR<Question[]>(
        'adminQuestions',
        () => fetchQuestions()  // Arrow function to prevent SWR from passing key as argument
    );

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
                showToast('Berhasil! Soal telah diperbarui.', 'success');
            } else {
                await createQuestion(formData);
                showToast('Berhasil! Soal telah ditambahkan.', 'success');
            }
            mutate();
            handleCloseModal();
        } catch (error) {
            console.error('Save failed:', error);
            showToast('Gagal menyimpan soal. Silakan coba lagi.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Delete confirmation flow
    const handleDeleteClick = (id_soal: string) => {
        setQuestionToDelete(id_soal);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!questionToDelete) return;
        setIsDeleting(true);
        try {
            await deleteQuestion(questionToDelete);
            mutate();
            showToast('Berhasil! Soal telah dihapus.', 'success');
        } catch (error) {
            console.error('Delete failed:', error);
            showToast('Gagal menghapus soal. Silakan coba lagi.', 'error');
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setQuestionToDelete(null);
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

    const filteredQuestions = questions.filter(q =>
        q.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.id_soal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.kategori?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout
            title="Bank Soal"
            subtitle="Kelola materi ujian, tipe soal, dan kunci jawaban sistem."
            headerActions={
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowImporter(true)}
                        className="h-11 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all font-bold px-6"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Berkas
                    </Button>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="h-11 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all font-black uppercase tracking-widest text-[10px] px-8"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Soal Baru
                    </Button>
                </div>
            }
        >
            <div className="space-y-8">

                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <FileQuestion className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Soal</p>
                                    <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Single</p>
                                    <p className="text-2xl font-bold text-slate-900">{questions.filter(q => q.tipe === 'SINGLE').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complex</p>
                                    <p className="text-2xl font-bold text-slate-900">{questions.filter(q => q.tipe === 'COMPLEX').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">T/F Multi</p>
                                    <p className="text-2xl font-bold text-slate-900">{questions.filter(q => q.tipe === 'TRUE_FALSE_MULTI').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter & Search */}
                <Card className="rounded-xl border border-gray-100 shadow-sm bg-white p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <Input
                                placeholder="Cari ID soal, kategori, atau isi pertanyaan..."
                                className="h-10 pl-10 border-slate-200 focus:border-slate-900 rounded-xl bg-slate-50/30 transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                            {filteredQuestions.length} Items
                        </div>
                    </div>
                </Card>

                {/* Questions Table */}
                <Card className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                    <div className="rounded-lg border bg-white overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-gray-100 h-12">
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center w-16">#</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400">Konten Pertanyaan</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center">Tipe</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center">Bobot</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center w-20">Media</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                                            <p className="text-slate-400 font-bold mt-4 tracking-wider text-xs uppercase">Sinkronisasi Bank Soal...</p>
                                        </td>
                                    </tr>
                                ) : filteredQuestions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-4">
                                                <SearchX className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="text-slate-500 font-bold">Soal Tidak Ditemukan</p>
                                            <p className="text-slate-400 text-sm">Gunakan kriteria pencarian lain atau buat soal baru.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuestions.map((question) => (
                                        <tr key={question.id_soal} className="h-20 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-bold text-slate-300">#{question.nomor_urut}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-md">
                                                    <p className="font-bold text-slate-900 tracking-tight line-clamp-2 leading-relaxed">{question.pertanyaan}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                                                            {question.kategori || 'GENERAL'}
                                                        </div>
                                                        <span className="text-[10px] text-slate-300 font-mono">{question.id_soal}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest shadow-none ${question.tipe === 'COMPLEX' ? 'border-amber-200 text-amber-600 bg-amber-50/50' :
                                                        question.tipe === 'TRUE_FALSE_MULTI' ? 'border-purple-200 text-purple-600 bg-purple-50/50' :
                                                            'border-blue-200 text-blue-600 bg-blue-50/50'
                                                        }`}
                                                >
                                                    {question.tipe}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-700 font-bold text-xs border border-slate-100">
                                                    {question.bobot}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {question.gambar_url ? (
                                                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100">
                                                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 border border-slate-100">
                                                        <X className="w-3 h-3 text-slate-200" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenModal(question as QuestionWithKey)}
                                                        className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(question.id_soal)}
                                                        className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Editor Modal - MAXIMIZED FOR DESKTOP */}
                <AnimatePresence>
                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl w-[90vw] max-w-[1200px] h-[85vh] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
                            >
                                {/* Modal Header */}
                                <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                                                {editingQuestion ? 'Perbarui Soal' : 'Buat Soal Baru'}
                                            </h2>
                                            <p className="text-base text-gray-500 mt-1">
                                                Konfigurasi materi pertanyaan, opsi jawaban, dan kategorisasi.
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCloseModal}
                                            className="h-10 w-10 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Modal Body - Scrollable */}
                                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                                    <div className="p-10">
                                        {/* 2 COLUMN LAYOUT */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                                            {/* COLUMN 1: Question Content */}
                                            <div className="space-y-8">
                                                {/* Administrative Data */}
                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                                            Data Administratif
                                                        </h3>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-5">
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-semibold text-gray-700">ID Soal</label>
                                                            <Input
                                                                value={formData.id_soal}
                                                                disabled={!!editingQuestion}
                                                                className="h-12 px-4 text-base font-mono bg-gray-50"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-semibold text-gray-700">No Urut</label>
                                                            <Input
                                                                type="number"
                                                                value={formData.nomor_urut}
                                                                onChange={e => setFormData({ ...formData, nomor_urut: parseInt(e.target.value) })}
                                                                className="h-12 px-4 text-base text-center font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">Jenis Pertanyaan</label>
                                                        <select
                                                            className="flex h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-base text-gray-900 transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                            value={formData.tipe}
                                                            onChange={e => setFormData({ ...formData, tipe: e.target.value as any, kunci_jawaban: '' })}
                                                        >
                                                            <option value="SINGLE">Pilihan Ganda Tunggal</option>
                                                            <option value="COMPLEX">Pilihan Ganda Kompleks (Multi-jawaban)</option>
                                                            <option value="TRUE_FALSE_MULTI">Benar / Salah Multi</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Question Narrative */}
                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-1.5 h-5 bg-purple-600 rounded-full" />
                                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                                            Narasi Pertanyaan
                                                        </h3>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">Isi Butir Pertanyaan</label>
                                                        <textarea
                                                            className="w-full min-h-[200px] rounded-lg border border-gray-200 bg-white p-4 text-base text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all leading-relaxed resize-y"
                                                            value={formData.pertanyaan}
                                                            onChange={e => setFormData({ ...formData, pertanyaan: e.target.value })}
                                                            placeholder="Tuliskan butir soal di sini... (Gunakan spasi ganda untuk paragraf baru)"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">
                                                            Lampiran Media (URL Gambar)
                                                        </label>
                                                        <Input
                                                            value={formData.gambar_url}
                                                            onChange={e => setFormData({ ...formData, gambar_url: e.target.value })}
                                                            placeholder="https://storage.example.com/images/soal-001.png"
                                                            className="h-12 px-4 text-base"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* COLUMN 2: Answers & Metadata */}
                                            <div className="space-y-8">
                                                {/* Answer Options or T/F Editor */}
                                                {formData.tipe === 'TRUE_FALSE_MULTI' ? (
                                                    <TrueFalseMultiEditor
                                                        statements={formData.statements_json}
                                                        answers={formData.answer_json}
                                                        onStatementsChange={s => setFormData(prev => ({ ...prev, statements_json: s }))}
                                                        onAnswersChange={a => setFormData(prev => ({ ...prev, answer_json: a }))}
                                                    />
                                                ) : (
                                                    <div className="space-y-5">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-1.5 h-5 bg-emerald-600 rounded-full" />
                                                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                                                Opsi Jawaban
                                                            </h3>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                                const key = `opsi_${opt.toLowerCase()}` as keyof typeof formData;
                                                                const isChecked = formData.tipe === 'COMPLEX'
                                                                    ? formData.kunci_jawaban.split(',').includes(opt)
                                                                    : formData.kunci_jawaban === opt;

                                                                return (
                                                                    <div
                                                                        key={opt}
                                                                        className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${isChecked
                                                                            ? 'border-emerald-400 bg-emerald-50'
                                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                                            }`}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleKeySelection(opt)}
                                                                            className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base transition-all shrink-0 ${isChecked
                                                                                ? 'bg-emerald-600 text-white shadow-md'
                                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                                                }`}
                                                                        >
                                                                            {opt}
                                                                        </button>
                                                                        <Input
                                                                            value={formData[key] as string}
                                                                            onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                                                                            placeholder={`Isi opsi ${opt}...`}
                                                                            className="h-11 border-0 bg-transparent shadow-none text-base font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0 flex-1"
                                                                        />
                                                                        {isChecked && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <p className="text-sm text-center text-gray-500 bg-gray-50 py-3 rounded-lg border border-gray-100">
                                                            💡 Klik huruf <strong>[A-E]</strong> untuk menandai sebagai kunci jawaban
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Metadata */}
                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-1.5 h-5 bg-gray-800 rounded-full" />
                                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                                            Metadata Ujian
                                                        </h3>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-5">
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-semibold text-gray-700">Bobot Skor</label>
                                                            <Input
                                                                type="number"
                                                                value={formData.bobot}
                                                                onChange={e => setFormData({ ...formData, bobot: parseInt(e.target.value) })}
                                                                className="h-12 px-4 text-base text-center font-bold"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-semibold text-gray-700">Kategori</label>
                                                            <Input
                                                                value={formData.kategori}
                                                                onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                                                                placeholder="Literasi, Numerasi, dll"
                                                                className="h-12 px-4 text-base"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer - Sticky */}
                                    <div className="px-10 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseModal}
                                            className="h-12 px-8 min-w-[120px] font-semibold"
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-12 px-8 min-w-[160px] bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-5 h-5 mr-2" />
                                            )}
                                            {editingQuestion ? 'Perbarui Soal' : 'Simpan Soal'}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Import Modal */}
                <AnimatePresence>
                    {showImporter && (
                        <QuestionImporter
                            onClose={() => setShowImporter(false)}
                            onSuccess={() => mutate()}
                        />
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-7 h-7 text-amber-600" />
                            </div>
                            <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                                Hapus Soal Ini?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-[15px] leading-relaxed text-gray-600">
                                Tindakan ini tidak dapat dibatalkan. Soal akan hilang permanen dari database sekolah Anda.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-2">
                            <AlertDialogCancel
                                disabled={isDeleting}
                                className="min-w-[100px]"
                            >
                                Batal
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Menghapus...
                                    </>
                                ) : (
                                    'Ya, Hapus'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Toast Notifications */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, x: 20 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl border shadow-lg min-w-[320px] ${toast.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                                }`}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium">{toast.message}</span>
                            <button
                                onClick={() => setToast(null)}
                                className="ml-auto text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AdminLayout>
    );
}
