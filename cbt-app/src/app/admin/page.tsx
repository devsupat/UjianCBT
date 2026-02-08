'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertCircle, Loader2, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithPassword } from '@/lib/auth';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Email harus diisi');
            return;
        }

        if (!password.trim()) {
            setError('Password harus diisi');
            return;
        }

        setIsLoading(true);
        console.log('🔐 Attempting login with:', email);

        try {
            const { user, profile, error: authError } = await signInWithPassword(email, password);

            console.log('📊 Auth result:', { user: !!user, profile, authError });

            if (authError || !user) {
                setError(authError || 'Login gagal. Periksa email dan password Anda.');
                setIsLoading(false);
                return;
            }

            // Verify admin role
            console.log('👤 Profile role:', profile?.role);
            if (profile?.role !== 'ADMIN') {
                setError('Akses ditolak. Hanya admin yang dapat login di halaman ini.');
                setIsLoading(false);
                return;
            }

            // Success - redirect to dashboard
            console.log('✅ Login successful, redirecting...');
            // Use window.location to ensure session cookies are included
            window.location.href = '/admin/dashboard';
        } catch (err) {
            console.error('❌ Login error:', err);
            setError('Terjadi kesalahan. Coba lagi.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
            {/* Enhanced Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-300 to-indigo-400 rounded-full blur-3xl opacity-40"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-violet-300 to-purple-400 rounded-full blur-3xl opacity-40"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5],
                        rotate: [0, -90, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-full blur-3xl opacity-30"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-[840px] relative z-10"
            >
                {/* Premium Glassmorphic Card */}
                <Card className="shadow-2xl shadow-indigo-900/20 border-0 bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[48px] ring-1 ring-white/50">
                    <CardHeader className="flex flex-col items-center text-center space-y-6 sm:space-y-8 pb-10 pt-20 px-7 sm:px-12 lg:px-[60px] bg-gradient-to-b from-white/60 to-transparent">
                        {/* Premium Logo Badge */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                            className="relative mb-2"
                        >
                            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                                <Shield className="w-14 h-14 text-white drop-shadow-2xl" />
                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/20 to-white/40" />

                                {/* Animated Glow Effect */}
                                <motion.div
                                    className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 opacity-60"
                                    animate={{
                                        rotate: [0, 360],
                                        opacity: [0.4, 0.7, 0.4]
                                    }}
                                    transition={{
                                        rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                                        opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                    }}
                                    style={{ filter: 'blur(16px)', zIndex: -1 }}
                                />

                                {/* Premium Badge */}
                                <motion.div
                                    className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg"
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Sparkles className="w-4 h-4 text-white" />
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="w-full"
                        >
                            <CardTitle className="text-4xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent tracking-tight leading-tight">
                                Admin Dashboard
                            </CardTitle>
                            <CardDescription className="mt-4 text-lg text-slate-600 font-medium">
                                Masukkan email dan password administrator
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="px-7 sm:px-12 lg:px-[60px] pb-20 flex flex-col items-center">
                        <div className="w-full max-w-[900px] mx-auto">
                            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-y-[18px] sm:gap-y-[24px]">
                                {/* Enhanced Error Message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20, height: 0 }}
                                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 shadow-md"
                                    >
                                        <div className="p-2 bg-red-100 rounded-xl">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <span className="text-sm font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                {/* Premium Email Input */}
                                <motion.div
                                    className="space-y-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <label className="text-sm text-slate-700 flex items-center gap-2 font-bold">
                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                            <Mail className="w-4 h-4 text-blue-600" />
                                        </div>
                                        Email Admin
                                    </label>
                                    <div className="relative group">
                                        <Input
                                            type="email"
                                            placeholder="admin@xxx.cbt.internal"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isLoading}
                                            autoComplete="username"
                                            className="h-14 px-7 text-base bg-white/80 border border-slate-200 rounded-full focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium placeholder:text-slate-400 disabled:opacity-60 shadow-sm"
                                        />
                                    </div>
                                </motion.div>

                                {/* Premium Password Input */}
                                <motion.div
                                    className="space-y-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <label className="text-sm text-slate-700 flex items-center gap-2 font-bold">
                                        <div className="p-1.5 bg-violet-100 rounded-lg">
                                            <Lock className="w-4 h-4 text-violet-600" />
                                        </div>
                                        Password Admin
                                    </label>
                                    <div className="relative group">
                                        <Input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            autoComplete="current-password"
                                            className="h-14 px-7 text-base bg-white/80 border border-slate-200 rounded-full focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all font-medium disabled:opacity-60 shadow-sm"
                                        />
                                    </div>
                                </motion.div>

                                {/* Premium Submit Button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    <Button
                                        type="submit"
                                        className="w-full h-16 text-lg font-bold rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
                                        size="lg"
                                        disabled={isLoading}
                                    >
                                        {/* Shimmer Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                                        <div className="relative flex items-center justify-center gap-3">
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                    <span>Memproses...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-6 h-6" />
                                                    <span>Masuk ke Dashboard</span>
                                                </>
                                            )}
                                        </div>
                                    </Button>
                                </motion.div>
                            </form>

                            {/* Premium Footer Note */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="mt-6 sm:mt-7 lg:mt-8 text-center"
                            >
                                <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    Sistem Premium CBT Computer Based Test
                                </p>
                            </motion.div>
                        </div>
                    </CardContent>
                </Card>

                {/* Decorative Elements */}
                <motion.div
                    className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full blur-3xl opacity-20"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                    className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-3xl opacity-20"
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.2, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity }}
                />
            </motion.div>
        </div >
    );
}
