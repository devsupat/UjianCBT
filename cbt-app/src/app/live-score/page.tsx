'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
    Trophy,
    Lock,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Monitor,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLiveScore } from '@/lib/api';
import type { LiveScoreEntry, LiveScoreStats } from '@/types';

const PIN_CODE = process.env.NEXT_PUBLIC_LIVE_SCORE_PIN || '2025';

export default function LiveScorePage() {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimer, setBlockTimer] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        const unlocked = sessionStorage.getItem('live_score_unlocked');
        if (unlocked === 'true') {
            setIsUnlocked(true);
        }

        const blockedUntil = localStorage.getItem('live_score_blocked');
        if (blockedUntil) {
            const remaining = parseInt(blockedUntil) - Date.now();
            if (remaining > 0) {
                setIsBlocked(true);
                setBlockTimer(Math.ceil(remaining / 1000));
            } else {
                localStorage.removeItem('live_score_blocked');
            }
        }
    }, []);

    useEffect(() => {
        if (!isBlocked) return;

        const interval = setInterval(() => {
            setBlockTimer((prev) => {
                if (prev <= 1) {
                    setIsBlocked(false);
                    localStorage.removeItem('live_score_blocked');
                    setAttempts(0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isBlocked]);

    const { data, isLoading } = useSWR<{
        success: boolean;
        data?: LiveScoreEntry[];
        stats?: LiveScoreStats
    }>(
        isUnlocked ? 'liveScore' : null,
        getLiveScore,
        {
            refreshInterval: 5000,
            revalidateOnFocus: true,
        }
    );

    useEffect(() => {
        if (!autoScroll || !scrollRef.current) return;

        let direction = 1;
        const container = scrollRef.current;

        const scroll = () => {
            if (!container) return;

            container.scrollTop += direction * 1;

            if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
                direction = -1;
            } else if (container.scrollTop <= 0) {
                direction = 1;
            }
        };

        const interval = setInterval(scroll, 50);
        return () => clearInterval(interval);
    }, [autoScroll, data]);

    const handlePinSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) return;

        if (pin === PIN_CODE) {
            setIsUnlocked(true);
            sessionStorage.setItem('live_score_unlocked', 'true');
            setPinError('');
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPinError('PIN salah');

            if (newAttempts >= 3) {
                const blockUntil = Date.now() + 5 * 60 * 1000;
                localStorage.setItem('live_score_blocked', blockUntil.toString());
                setIsBlocked(true);
                setBlockTimer(300);
            }
        }

        setPin('');
    }, [pin, attempts, isBlocked]);

    const scores = data?.data || [];
    const stats = data?.stats;

    // PIN Screen
    if (!isUnlocked) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    <Card className="p-8 text-center shadow-xl">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Lock className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2 gradient-text">
                            Live Score
                        </h1>
                        <p className="text-slate-600 mb-6">
                            Masukkan PIN untuk akses
                        </p>

                        {isBlocked ? (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                <p className="text-red-600 font-semibold">Akses Diblokir</p>
                                <p className="text-slate-600 text-sm mt-2">
                                    Coba lagi dalam {Math.floor(blockTimer / 60)}:{(blockTimer % 60).toString().padStart(2, '0')}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handlePinSubmit} className="space-y-4">
                                <Input
                                    type="password"
                                    placeholder="Masukkan PIN"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="text-center text-2xl tracking-widest"
                                    maxLength={6}
                                />

                                {pinError && (
                                    <p className="text-red-500 text-sm">{pinError}</p>
                                )}

                                <Button type="submit" className="w-full" disabled={!pin.trim()}>
                                    <Lock className="w-4 h-4" />
                                    Buka Kunci
                                </Button>
                            </form>
                        )}
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Live Score Screen
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Announcement Bar */}
            <div className="announcement-bar px-4 py-2 text-center text-sm">
                <div className="flex items-center justify-center gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>
                        <strong>Penting:</strong> Kegiatan ini merupakan latihan/simulasi internal sekolah dan bukan Tes Kemampuan Akademik (TKA) resmi dari Kemendikdasmen.
                    </span>
                </div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">Live Score</h1>
                            <p className="text-slate-500 text-sm">Update setiap 5 detik</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant={autoScroll ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAutoScroll(!autoScroll)}
                        >
                            <Monitor className="w-4 h-4" />
                            Auto Scroll: {autoScroll ? 'ON' : 'OFF'}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-6">
                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <Card className="p-4 text-center shadow-md">
                            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500">Total Peserta</p>
                        </Card>
                        <Card className="p-4 text-center shadow-md">
                            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{stats.sedang}</p>
                            <p className="text-xs text-slate-500">Sedang Ujian</p>
                        </Card>
                        <Card className="p-4 text-center shadow-md">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{stats.selesai}</p>
                            <p className="text-xs text-slate-500">Selesai</p>
                        </Card>
                        <Card className="p-4 text-center shadow-md">
                            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{stats.diskualifikasi}</p>
                            <p className="text-xs text-slate-500">Diskualifikasi</p>
                        </Card>
                        <Card className="p-4 text-center shadow-md">
                            <Users className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{stats.belum}</p>
                            <p className="text-xs text-slate-500">Belum Mulai</p>
                        </Card>
                    </div>
                )}

                {/* Leaderboard */}
                <Card className="overflow-hidden shadow-lg">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">Papan Peringkat</h2>
                    </div>

                    <div
                        ref={scrollRef}
                        className="max-h-[calc(100vh-400px)] overflow-y-auto"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            </div>
                        ) : scores.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p>Belum ada peserta yang selesai</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Kelas</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Skor</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <AnimatePresence>
                                        {scores.map((score, index) => (
                                            <motion.tr
                                                key={`${score.nama}-${score.waktu_submit_ms}`}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -100 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                className={`${score.status === 'DISKUALIFIKASI'
                                                        ? 'bg-red-50/50'
                                                        : index < 3
                                                            ? 'bg-amber-50/50'
                                                            : 'bg-white'
                                                    }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {score.rank === 1 && <span className="text-2xl">🥇</span>}
                                                        {score.rank === 2 && <span className="text-2xl">🥈</span>}
                                                        {score.rank === 3 && <span className="text-2xl">🥉</span>}
                                                        {score.rank > 3 && (
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${score.status === 'DISKUALIFIKASI'
                                                                    ? 'bg-red-100 text-red-600'
                                                                    : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {score.rank}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-semibold ${score.status === 'DISKUALIFIKASI' ? 'text-red-600' : 'text-slate-800'
                                                        }`}>
                                                        {score.nama}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {score.kelas}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-2xl font-bold ${score.skor >= 80 ? 'text-emerald-600' :
                                                            score.skor >= 60 ? 'text-blue-600' :
                                                                score.skor >= 40 ? 'text-amber-600' : 'text-red-600'
                                                        }`}>
                                                        {score.skor.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={score.status === 'SELESAI' ? 'success' : 'destructive'}>
                                                        {score.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500 text-sm">
                                                    {score.waktu_selesai}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
