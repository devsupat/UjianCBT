'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, AlertCircle, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            {/* Announcement Bar */}
            <div className="announcement-bar px-4 py-2 text-center text-sm">
                <div className="flex items-center justify-center gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>
                        <strong>Penting:</strong> Kegiatan ini merupakan latihan/simulasi internal sekolah dan bukan Tes Kemampuan Akademik (TKA) resmi dari Kemendikdasmen.
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-44px)]">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    <Card className="shadow-xl border-slate-200">
                        <CardHeader className="text-center space-y-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25"
                            >
                                <LogIn className="w-10 h-10 text-white" />
                            </motion.div>
                            <div>
                                <CardTitle className="text-2xl gradient-text">
                                    Login Ujian
                                </CardTitle>
                                <CardDescription className="mt-2">
                                    Masukkan username dan password untuk memulai ujian
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm text-slate-600 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Username
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Masukkan username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="username"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-slate-600 flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
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

                            <p className="mt-6 text-center text-xs text-slate-500">
                                Hubungi pengawas jika mengalami kendala login
                            </p>
                        </CardContent>
                    </Card>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        {process.env.NEXT_PUBLIC_APP_NAME || 'CBT System'}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
