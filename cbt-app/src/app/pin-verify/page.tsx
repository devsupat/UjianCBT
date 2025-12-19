'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Loader2, KeyRound, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateExamPin } from '@/lib/api';
import { useExamStore } from '@/store/examStore';

export default function PinVerifyPage() {
    const router = useRouter();
    const { user } = useExamStore();

    const [pin, setPin] = useState('');
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

        if (!pin.trim()) {
            setError('PIN harus diisi');
            return;
        }

        setIsLoading(true);

        try {
            const response = await validateExamPin(pin.trim());

            if (response.success) {
                // Set flag in sessionStorage so exam page knows PIN is validated
                sessionStorage.setItem('pin_validated', 'true');
                router.push('/exam');
            } else {
                setError(response.message || 'PIN salah');
                setPin(''); // Clear input on error
            }
        } catch {
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
                className="w-full max-w-md relative"
            >
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100/50 p-8 sm:p-10 border border-slate-100">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                            Menunggu PIN dari Pengawas
                        </h1>
                        <p className="text-slate-500">
                            Tanyakan PIN ke pengawas ujian untuk memulai
                        </p>
                    </div>

                    {/* Info Banner */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-6">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700">
                            <p className="font-medium mb-1">Hai, {user.nama_lengkap}!</p>
                            <p className="text-blue-600">Login berhasil. Tunggu pengawas memberikan PIN untuk memulai ujian.</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* PIN Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 block">
                                PIN Ujian
                            </label>
                            <div className="flex items-center h-14 rounded-xl border-2 border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden">
                                <div className="w-14 h-full flex items-center justify-center flex-shrink-0 border-r-2 border-slate-200 bg-slate-100">
                                    <KeyRound className="w-6 h-6 text-slate-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Masukkan PIN"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                                    disabled={isLoading}
                                    autoFocus
                                    className="flex-1 h-full px-4 bg-transparent border-none outline-none text-lg font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal tracking-wider"
                                    maxLength={10}
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                PIN dapat berupa angka atau huruf (misal: 2024 atau ABC123)
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                            size="lg"
                            disabled={isLoading || !pin.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memvalidasi...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Mulai Ujian
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Help Text */}
                    <p className="mt-6 text-center text-sm text-slate-400">
                        Jika mengalami kendala, hubungi pengawas ujian
                    </p>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-400">
                    {user.kelas} • NISN: {user.username}
                </p>
            </motion.div>
        </div>
    );
}
