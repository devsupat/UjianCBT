'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Trophy, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useExamStore } from '@/store/examStore';

function ThankYouContent() {
    const searchParams = useSearchParams();
    const score = searchParams.get('score') || '0';
    const { user, resetExam } = useExamStore();

    useEffect(() => {
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', () => {
            window.history.pushState(null, '', window.location.href);
        });
    }, []);

    const scoreNum = parseFloat(score);
    const getScoreColor = () => {
        if (scoreNum >= 80) return 'text-emerald-600';
        if (scoreNum >= 60) return 'text-blue-600';
        if (scoreNum >= 40) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreMessage = () => {
        if (scoreNum >= 80) return 'Luar Biasa! 🎉';
        if (scoreNum >= 60) return 'Bagus! 👍';
        if (scoreNum >= 40) return 'Cukup Baik';
        return 'Tetap Semangat!';
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                <Card className="p-8 text-center shadow-xl">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25"
                    >
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>

                    <h1 className="text-3xl font-bold mb-2 gradient-text">
                        Ujian Selesai!
                    </h1>

                    {user && (
                        <p className="text-slate-600 mb-6">
                            Terima kasih, <span className="text-slate-800 font-semibold">{user.nama_lengkap}</span>
                        </p>
                    )}

                    <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-200">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Trophy className="w-6 h-6 text-amber-500" />
                            <span className="text-slate-600">Skor Anda</span>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className={`text-6xl font-bold ${getScoreColor()}`}
                        >
                            {parseFloat(score).toFixed(1)}
                        </motion.div>
                        <p className="text-2xl mt-2 text-slate-700">{getScoreMessage()}</p>
                    </div>

                    <p className="text-slate-500 text-sm mb-6">
                        Hasil ujian telah tersimpan. Anda dapat menutup halaman ini.
                    </p>

                    <Link href="/login" onClick={() => resetExam()}>
                        <Button variant="outline" className="w-full">
                            <Home className="w-4 h-4" />
                            Kembali ke Login
                        </Button>
                    </Link>
                </Card>
            </motion.div>
        </div>
    );
}

export default function ThankYouPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        }>
            <ThankYouContent />
        </Suspense>
    );
}
