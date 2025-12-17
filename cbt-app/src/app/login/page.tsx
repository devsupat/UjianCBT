'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { login } from '@/lib/api';
import { useExamStore } from '@/store/examStore';

export default function LoginPage() {
    const router = useRouter();
    const { setUser, setTimeRemaining, setIsExamStarted } = useExamStore();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Username dan password harus diisi');
            return;
        }

        setIsLoading(true);

        try {
            const response = await login(username.trim(), password);

            if (response.success && response.data) {
                setUser(response.data);
                const durationMinutes = response.data.exam_duration || 90;
                setTimeRemaining(durationMinutes * 60);
                setIsExamStarted(true);
                router.push('/exam');
            } else {
                setError(response.message || 'Login gagal');
            }
        } catch {
            setError('Terjadi kesalahan. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400 rounded-full blur-3xl opacity-20" />
                </div>
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            <div className="flex items-center justify-center px-4 py-12 min-h-screen relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md"
                >
                    <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-xl overflow-hidden">
                        <CardContent className="p-8 sm:p-10">
                            {/* School Logo */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="flex justify-center mb-6"
                            >
                                <div className="w-28 h-28 rounded-full bg-white shadow-xl ring-4 ring-blue-100 overflow-hidden flex items-center justify-center p-2">
                                    <Image
                                        src="https://i.imgur.com/T3CL7cm.jpeg"
                                        alt="School Logo"
                                        width={112}
                                        height={112}
                                        className="w-full h-full object-contain rounded-full"
                                        priority
                                    />
                                </div>
                            </motion.div>

                            {/* Title */}
                            <div className="text-center mb-8">
                                <motion.h1
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-2xl sm:text-3xl font-bold text-slate-800"
                                >
                                    Login Ujian
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-slate-500 mt-2 text-sm"
                                >
                                    Masukkan username dan password untuk memulai ujian
                                </motion.p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        Username
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Masukkan username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="username"
                                        className="h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-blue-600" />
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                        className="h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 transition-all duration-300"
                                    size="lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5" />
                                            Masuk
                                        </>
                                    )}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-xs text-slate-400">
                                Hubungi pengawas jika mengalami kendala login
                            </p>
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6 text-center text-sm text-white/70"
                    >
                        {process.env.NEXT_PUBLIC_APP_NAME || 'CBT Sekolah'}
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}
