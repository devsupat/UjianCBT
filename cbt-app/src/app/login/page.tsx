'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { LogIn, User, KeyRound, AlertCircle, Loader2, ArrowLeft, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginWithUsername } from '@/lib/auth'; // NEW: Supabase Auth
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
            // NEW: Use Supabase Auth login
            const response = await loginWithUsername(username.trim(), password);

            if (response.success && response.data) {
                setUser(response.data);
                const durationMinutes = response.data.exam_duration || 90;
                setTimeRemaining(durationMinutes * 60);
                setIsExamStarted(true);

                // Check if PIN is required (TODO: Move to config table)
                // For now, skip PIN verification and go directly to exam
                router.push('/exam');
            } else {
                setError(response.message || 'Login gagal');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Terjadi kesalahan. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - School Building Image (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background Image */}
                <Image
                    src="https://i.imgur.com/7FixKW0.jpeg"
                    alt="School Building"
                    fill
                    className="object-cover"
                    priority
                />

                {/* Dark Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-blue-900/70 to-slate-900/80" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-md text-center"
                    >
                        {/* School Logo */}
                        <div className="flex justify-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                                className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden ring-4 ring-white/30"
                            >
                                <Image
                                    src="https://i.imgur.com/lp0JAqH.png"
                                    alt="School Logo"
                                    width={112}
                                    height={112}
                                    className="w-24 h-24 object-contain"
                                />
                            </motion.div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl font-bold text-blue-50 mb-4">
                            CBT Serverless
                        </h1>
                        <p className="text-blue-200/80 text-lg mb-12 leading-relaxed">
                            Platform ujian online modern dengan teknologi serverless yang aman dan handal
                        </p>

                        {/* Value Propositions */}
                        <div className="space-y-4 text-left">
                            {[
                                { icon: Shield, title: 'Secure', desc: 'Sistem anti-cheat terintegrasi' },
                                { icon: Sparkles, title: 'Reliable', desc: 'Auto-save setiap perubahan' },
                                { icon: CheckCircle, title: 'Real-time', desc: 'Live score monitoring' },
                            ].map((item, idx) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + idx * 0.1 }}
                                    className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
                                >
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-5 h-5 text-blue-200" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-blue-50">{item.title}</h3>
                                        <p className="text-sm text-blue-300/70">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Testimonial Quote */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            className="mt-14 pt-8 border-t border-white/10"
                        >
                            <p className="text-xl font-light text-blue-100/90 italic">
                                "Secure. Reliable. Real-time."
                            </p>
                            <p className="text-sm text-blue-300/60 mt-3">
                                Sistem Ujian Berbasis Komputer Modern
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col bg-slate-50 relative">
                {/* Back to Home Link - Fixed Position */}
                <div className="absolute top-6 left-6 z-20">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-lg transition-all text-sm font-semibold group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Kembali ke Beranda
                    </Link>
                </div>

                {/* Form Container */}
                <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-[780px]"
                    >
                        {/* Form Card */}
                        <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl shadow-indigo-100/50 px-10 py-10 sm:px-24 lg:px-32 border border-white flex flex-col items-center">
                            {/* School Logo */}
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg shadow-slate-200 overflow-hidden ring-4 ring-indigo-50">
                                    <Image
                                        src="https://i.imgur.com/lp0JAqH.png"
                                        alt="School Logo"
                                        width={80}
                                        height={80}
                                        className="w-16 h-16 object-contain"
                                    />
                                </div>
                            </div>

                            <div className="text-center mb-10 w-full max-w-[580px] flex flex-col items-center">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    Selamat Datang
                                </h1>
                                <p className="text-slate-500 mt-3 font-medium">
                                    Silakan masuk untuk memulai ujian
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-y-[18px] sm:gap-y-[24px]">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-4 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm shadow-sm"
                                    >
                                        <div className="p-2 bg-red-100 rounded-xl">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        </div>
                                        <span className="font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                {/* Username Field - Flexbox approach */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Username / NISN
                                    </label>
                                    <div className="flex items-center h-14 rounded-full border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden shadow-sm">
                                        <div className="w-14 h-full flex items-center justify-center flex-shrink-0 border-r border-slate-200 bg-slate-100/50">
                                            <User className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Masukkan username atau NISN"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            disabled={isLoading}
                                            autoComplete="username"
                                            className="flex-1 h-full px-6 bg-transparent border-none outline-none text-base text-slate-800 placeholder:text-slate-400 font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Password Field - Flexbox approach */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Password
                                    </label>
                                    <div className="flex items-center h-14 rounded-full border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden shadow-sm">
                                        <div className="w-14 h-full flex items-center justify-center flex-shrink-0 border-r border-slate-200 bg-slate-100/50">
                                            <KeyRound className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="Masukkan password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            autoComplete="current-password"
                                            className="flex-1 h-full px-6 bg-transparent border-none outline-none text-base text-slate-800 placeholder:text-slate-400 font-medium"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-15 rounded-full text-base font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 tracking-wide"
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
                        </div>

                        {/* Help Text */}
                        <p className="mt-6 text-center text-sm text-slate-400">
                            Hubungi pengawas jika mengalami kendala login
                        </p>
                    </motion.div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-slate-400">
                    © 2026 {process.env.NEXT_PUBLIC_APP_NAME || "SDN Sukasari 4"}
                </p>
            </div>
        </div>
    );
}
