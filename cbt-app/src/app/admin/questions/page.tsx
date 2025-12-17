'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Pencil,
    Trash2,
    ArrowLeft,
    FileQuestion,
    Loader2,
    X,
    Save,
    Image as ImageIcon
} from 'lucide-react';
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
    const router = useRouter();
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

    useEffect(() => {
        const auth = sessionStorage.getItem('admin_auth');
        if (auth !== 'true') {
            router.replace('/admin');
        }
    }, [router]);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold gradient-text">Kelola Soal</h1>
                    </div>

                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4" />
                        Tambah Soal
                    </Button>
                </div>
            </header>

            <div className="container mx-auto px-6 py-6">
                <Card className="overflow-hidden shadow-lg">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Bank Soal</h2>
                        <span className="text-slate-500">{questions.length} soal</span>
                    </div>

                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <FileQuestion className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p>Belum ada soal</p>
                                <Button className="mt-4" onClick={() => handleOpenModal()}>
                                    <Plus className="w-4 h-4" />
                                    Tambah Soal Pertama
                                </Button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pertanyaan</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Tipe</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Bobot</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Gambar</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {questions.map((question) => (
                                        <tr key={question.id_soal} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-mono text-slate-500">
                                                {question.nomor_urut}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-800">{truncate(question.pertanyaan, 60)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant={question.tipe === 'COMPLEX' ? 'warning' : 'default'}>
                                                    {question.tipe}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-600">{question.bobot}</td>
                                            <td className="px-6 py-4 text-center">
                                                {question.gambar_url ? (
                                                    <ImageIcon className="w-4 h-4 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenModal(question as QuestionWithKey)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(question.id_soal)}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
            </div>

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
                            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {editingQuestion ? 'Edit Soal' : 'Tambah Soal Baru'}
                                </h2>
                                <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-600 mb-1 block">ID Soal</label>
                                        <Input
                                            value={formData.id_soal}
                                            onChange={(e) => setFormData({ ...formData, id_soal: e.target.value })}
                                            disabled={!!editingQuestion}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600 mb-1 block">Nomor Urut</label>
                                        <Input
                                            type="number"
                                            value={formData.nomor_urut}
                                            onChange={(e) => setFormData({ ...formData, nomor_urut: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600 mb-1 block">Tipe</label>
                                        <select
                                            className="w-full h-11 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            value={formData.tipe}
                                            onChange={(e) => setFormData({ ...formData, tipe: e.target.value as 'SINGLE' | 'COMPLEX', kunci_jawaban: '' })}
                                        >
                                            <option value="SINGLE">Pilihan Ganda</option>
                                            <option value="COMPLEX">Pilihan Ganda Kompleks</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 mb-1 block">Pertanyaan</label>
                                    <textarea
                                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm min-h-[100px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        value={formData.pertanyaan}
                                        onChange={(e) => setFormData({ ...formData, pertanyaan: e.target.value })}
                                        placeholder="Tuliskan pertanyaan..."
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 mb-1 block">URL Gambar (opsional)</label>
                                    <Input
                                        value={formData.gambar_url}
                                        onChange={(e) => setFormData({ ...formData, gambar_url: e.target.value })}
                                        placeholder="https://drive.google.com/file/d/..."
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm text-slate-600">Opsi Jawaban & Kunci</label>
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
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${isKey
                                                            ? 'bg-emerald-500 text-white shadow-md'
                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                                <Input
                                                    value={formData[key] as string}
                                                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                    placeholder={`Opsi ${opt}${opt === 'E' ? ' (opsional)' : ''}`}
                                                    className="flex-1"
                                                />
                                            </div>
                                        );
                                    })}
                                    <p className="text-xs text-slate-500">
                                        Klik huruf untuk memilih kunci jawaban. {formData.tipe === 'COMPLEX' && 'Bisa pilih lebih dari satu.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-600 mb-1 block">Bobot</label>
                                        <Input
                                            type="number"
                                            value={formData.bobot}
                                            onChange={(e) => setFormData({ ...formData, bobot: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600 mb-1 block">Kategori (opsional)</label>
                                        <Input
                                            value={formData.kategori}
                                            onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                            placeholder="Contoh: Matematika"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                                        Batal
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Simpan
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
