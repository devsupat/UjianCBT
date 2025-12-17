'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { XCircle, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useExamStore } from '@/store/examStore';

export default function DisqualifiedPage() {
    const { user, resetExam } = useExamStore();

    useEffect(() => {
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', () => {
            window.history.pushState(null, '', window.location.href);
        });
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-red-50/20 to-slate-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                <Card className="p-8 text-center shadow-xl border-red-200">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/25"
                    >
                        <XCircle className="w-12 h-12 text-white" />
                    </motion.div>

                    <h1 className="text-3xl font-bold mb-2 text-red-600">
                        Ujian Dihentikan
                    </h1>

                    {user && (
                        <p className="text-slate-600 mb-6">
                            {user.nama_lengkap} - {user.kelas}
                        </p>
                    )}

                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <span className="text-red-600 font-semibold">DISKUALIFIKASI</span>
                        </div>
                        <p className="text-slate-700">
                            Ujian Anda telah dihentikan karena pelanggaran berulang.
                        </p>
                    </div>

                    <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 text-sm border border-slate-200">
                        <p className="font-semibold mb-2 text-slate-700">Pelanggaran yang terdeteksi:</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-1">
                            <li>Berpindah tab/aplikasi saat ujian</li>
                            <li>Mencoba copy/paste</li>
                            <li>Menggunakan shortcut keyboard terlarang</li>
                        </ul>
                    </div>

                    <p className="text-slate-500 text-sm mb-6">
                        Silakan hubungi pengawas untuk informasi lebih lanjut.
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
