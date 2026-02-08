'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, ArrowRight, AlertCircle, ShieldCheck, User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyExamAccess } from '@/lib/queries';
import { useExamStore } from '@/store/examStore';

export default function ExamEntrancePage() {
    const router = useRouter();
    const { user } = useExamStore();

    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!user) {
            router.push('/login');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token.trim()) {
            setError('Token ujian harus diisi');
            return;
        }

        setIsLoading(true);

        try {
            const response = await verifyExamAccess(token.trim());

            if (response.success) {
                // Set flag in sessionStorage so exam page knows token is validated
                sessionStorage.setItem('token_validated', 'true');
                sessionStorage.setItem('exam_packet', response.packet || 'A');
                router.push('/exam');
            } else {
                setError(response.error || 'Token tidak valid');
                setToken(''); // Clear input on error
            }
        } catch (err) {
            console.error('Token verification error:', err);
            setError('Terjadi kesalahan. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 px-4 py-12">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[150px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg relative"
            >
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100/50 p-8 sm:p-10 border border-slate-100">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                            Masuk Ruang Ujian
                        </h1>
                        <p className="text-slate-500">
                            Silakan masukkan Token Ujian yang diberikan oleh Pengawas
                        </p>
                    </div>

                    {/* Student Info Banner */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{user.nama_lengkap}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <BookOpen className="w-4 h-4" />
                                <span>{user.kelas || 'Kelas belum diatur'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Display */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100"
                            >
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-700">Gagal Memverifikasi</p>
                                    <p className="text-sm text-red-600 mt-0.5">{error}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Token Input */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 block">
                                Token Ujian
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Masukkan token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                                    disabled={isLoading}
                                    autoFocus
                                    className="h-14 pl-12 text-center text-2xl font-bold tracking-[0.3em] uppercase bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
                                    maxLength={8}
                                />
                            </div>
                            <p className="text-xs text-slate-400 text-center">
                                Token berupa 6 karakter huruf dan angka
                            </p>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300"
                            size="lg"
                            disabled={isLoading || !token.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Memverifikasi...
                                </>
                            ) : (
                                <>
                                    Mulai Mengerjakan
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-center text-sm text-slate-400">
                            Jika mengalami kendala, hubungi pengawas ujian Anda
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-400">
                    NISN: {user.username} • {new Date().toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </motion.div>
        </div>
    );
}
