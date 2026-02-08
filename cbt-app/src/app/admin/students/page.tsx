'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Search,
    Filter,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    Copy,
    Check,
    RefreshCw,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    createStudent,
    deleteStudent,
    getStudents,
    type StudentData,
    type CreateStudentInput
} from '@/actions/student-management';

export default function StudentsPage() {
    // State
    const [students, setStudents] = useState<StudentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateStudentInput>({
        fullName: '',
        username: '',
        password: '',
        classGroup: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Success message state
    const [successMessage, setSuccessMessage] = useState<{
        studentName: string;
        username: string;
        password: string;
    } | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Toast message
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load students on mount
    useEffect(() => {
        loadStudents();
    }, []);

    async function loadStudents() {
        setIsLoading(true);
        const result = await getStudents();
        if (result.success && result.data) {
            setStudents(result.data);
        } else {
            showToast('error', result.message);
        }
        setIsLoading(false);
    }

    async function handleRefresh() {
        setIsRefreshing(true);
        await loadStudents();
        setIsRefreshing(false);
    }

    // Get unique class groups for filter
    const uniqueClasses = useMemo(() => {
        const classes = students.map(s => s.classGroup).filter(Boolean) as string[];
        return Array.from(new Set(classes)).sort();
    }, [students]);

    // Filter students
    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.fullName.toLowerCase().includes(query) ||
                s.username.toLowerCase().includes(query)
            );
        }
        if (classFilter !== 'all') {
            filtered = filtered.filter(s => s.classGroup === classFilter);
        }
        return filtered;
    }, [students, searchQuery, classFilter]);

    function showToast(type: 'success' | 'error', text: string) {
        setToast({ type, text });
        setTimeout(() => setToast(null), 4000);
    }

    function resetForm() {
        setFormData({ fullName: '', username: '', password: '', classGroup: '' });
        setFormErrors({});
        setShowPassword(false);
    }

    function validateForm(): boolean {
        const errors: Record<string, string> = {};
        if (!formData.fullName.trim()) errors.fullName = 'Nama lengkap harus diisi';
        if (!formData.username.trim()) {
            errors.username = 'Username harus diisi';
        } else if (!/^[a-z0-9_]+$/.test(formData.username.toLowerCase())) {
            errors.username = 'Gunakan huruf kecil, angka, dan underscore saja';
        }
        if (!formData.password.trim()) {
            errors.password = 'Password harus diisi';
        } else if (formData.password.length < 4) {
            errors.password = 'Minimal 4 karakter';
        }
        if (!formData.classGroup.trim()) errors.classGroup = 'Kelas harus diisi';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleCreateStudent() {
        if (!validateForm()) return;
        setIsSubmitting(true);
        const result = await createStudent(formData);
        if (result.success && result.data) {
            setSuccessMessage({
                studentName: result.data.student.fullName,
                username: result.data.student.username,
                password: result.data.password
            });
            await loadStudents();
            setAddDialogOpen(false);
            resetForm();
        } else {
            showToast('error', result.message);
        }
        setIsSubmitting(false);
    }

    async function handleDeleteStudent() {
        if (!studentToDelete) return;
        setIsSubmitting(true);
        const result = await deleteStudent(studentToDelete.id);
        if (result.success) {
            showToast('success', result.message);
            await loadStudents();
            setDeleteDialogOpen(false);
            setStudentToDelete(null);
        } else {
            showToast('error', result.message);
        }
        setIsSubmitting(false);
    }

    function copyToClipboard(text: string, field: string) {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }

    return (
        <AdminLayout
            title="Manajemen Siswa"
            subtitle="Kelola database peserta ujian dan akses login siswa."
            headerActions={
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="h-10 border-slate-200 hover:bg-slate-50 transition-all font-bold"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                    <Button
                        onClick={() => setAddDialogOpen(true)}
                        className="h-10 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-lg transition-all font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Peserta Baru
                    </Button>
                </div>
            }
        >
            <div className="space-y-8">
                {/* Toast Notification */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="fixed top-8 right-8 z-50 px-6 py-4 rounded-xl shadow-xl border bg-white/90 backdrop-blur-md flex items-center gap-3"
                            style={{ borderColor: toast.type === 'success' ? '#10b981' : '#ef4444' }}
                        >
                            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
                            <span className="font-bold text-sm text-slate-800">{toast.text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filter Bar */}
                <Card className="rounded-xl border border-gray-100 shadow-sm bg-white p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <Input
                                placeholder="Cari nama atau username..."
                                className="h-10 pl-10 border-slate-200 focus:border-slate-900 rounded-xl bg-slate-50/30 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-full md:w-[200px] h-10 border-slate-200 rounded-xl bg-slate-50/30 font-semibold">
                                <SelectValue placeholder="Semua Kelas" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="all">Semua Kelas</SelectItem>
                                {uniqueClasses.map(kelas => (
                                    <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {/* Students Table */}
                <Card className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                    <div className="rounded-lg border bg-white overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-gray-100 h-12">
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400">Nama Lengkap</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center">Username</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center">Kelas</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-center">Status</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-400 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                                            <p className="text-slate-400 font-bold mt-4 tracking-wider text-xs uppercase">Melas Data...</p>
                                        </td>
                                    </tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-4">
                                                <Users className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="text-slate-500 font-bold">Data Kosong</p>
                                            <p className="text-slate-400 text-sm">Tidak ada siswa yang sesuai kriteria.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="h-16 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 uppercase">
                                                        {student.fullName.charAt(0)}
                                                    </div>
                                                    <p className="font-bold text-slate-900 tracking-tight">{student.fullName}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <code className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">@{student.username}</code>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="outline" className="rounded-lg font-bold border-slate-200 text-slate-500">
                                                    {student.classGroup}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${student.status_ujian === 'BELUM' ? 'bg-blue-50 text-blue-600' :
                                                    student.status_ujian === 'SEDANG' ? 'bg-amber-50 text-amber-600 animate-pulse' :
                                                        student.status_ujian === 'SELESAI' ? 'bg-emerald-50 text-emerald-600' :
                                                            'bg-red-50 text-red-600'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${student.status_ujian === 'BELUM' ? 'bg-blue-400' :
                                                        student.status_ujian === 'SEDANG' ? 'bg-amber-400' :
                                                            student.status_ujian === 'SELESAI' ? 'bg-emerald-400' :
                                                                'bg-red-400'
                                                        }`} />
                                                    {student.status_ujian}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    onClick={() => {
                                                        setStudentToDelete(student);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Add Dialog */}
                <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogContent className="sm:max-w-[650px] min-w-[500px] p-0 border border-gray-200 shadow-2xl rounded-2xl overflow-hidden">
                        {/* Modal Body - Spacious padding */}
                        <div className="px-8 py-6">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900">Tambah Peserta Baru</DialogTitle>
                                <DialogDescription className="text-base text-gray-500 mt-2">Lengkapi data di bawah ini untuk mendaftarkan akun siswa baru.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5">
                                {/* Nama Lengkap */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nama lengkap peserta</label>
                                    <Input
                                        placeholder="Contoh: Muhammad Rafli"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className={`h-12 px-4 text-base ${formErrors.fullName ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                    />
                                    {formErrors.fullName && <p className="text-sm text-red-500 mt-1">{formErrors.fullName}</p>}
                                </div>

                                {/* Username & Kelas - 2 columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Username login</label>
                                        <Input
                                            placeholder="budi_12"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                            className={`h-12 px-4 text-base ${formErrors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        />
                                        {formErrors.username && <p className="text-sm text-red-500 mt-1">{formErrors.username}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nama kelas / grup</label>
                                        <Input
                                            placeholder="XII IPA 1"
                                            value={formData.classGroup}
                                            onChange={(e) => setFormData({ ...formData, classGroup: e.target.value })}
                                            className={`h-12 px-4 text-base ${formErrors.classGroup ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        />
                                        {formErrors.classGroup && <p className="text-sm text-red-500 mt-1">{formErrors.classGroup}</p>}
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Minimal 4 karakter"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className={`h-12 px-4 text-base pr-12 ${formErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {formErrors.password && <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer - Spacious button layout */}
                        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end items-center gap-3">
                            <DialogClose asChild>
                                <Button variant="outline" className="w-full sm:w-auto min-w-[100px] h-11 px-6 font-semibold">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                onClick={handleCreateStudent}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto min-w-[160px] h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Simpan Siswa Baru
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Success Message Dialog */}
                <Dialog open={!!successMessage} onOpenChange={() => setSuccessMessage(null)}>
                    <DialogContent className="sm:max-w-md p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
                        <div className="p-8 space-y-6">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-xl font-bold text-slate-900">Siswa Berhasil Dibuat!</DialogTitle>
                                <DialogDescription>Gunakan kredensial berikut untuk login siswa.</DialogDescription>
                            </div>
                            <div className="space-y-3">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
                                    <p className="text-lg font-bold text-slate-900 font-mono tracking-tight">{successMessage?.username}</p>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(successMessage?.username || '', 'username')}>
                                        {copiedField === 'username' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Password</p>
                                    <p className="text-lg font-bold text-slate-900 font-mono tracking-tight">{successMessage?.password}</p>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(successMessage?.password || '', 'password')}>
                                        {copiedField === 'password' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <Button onClick={() => setSuccessMessage(null)} className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl">Selesai</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="sm:max-w-[400px] p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
                        <div className="p-8 space-y-4 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <DialogTitle className="text-xl font-bold text-slate-900">Hapus Peserta?</DialogTitle>
                            <DialogDescription className="text-slate-500">Aksi ini akan menghapus data <span className="font-bold text-slate-900">{studentToDelete?.fullName}</span> secara permanen.</DialogDescription>
                        </div>
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2">
                            <Button variant="ghost" className="flex-1 h-10 font-bold text-slate-500" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
                            <Button variant="destructive" className="flex-1 h-10 font-bold shadow-lg" onClick={handleDeleteStudent} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Hapus'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
