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
        <div className="min-h-screen bg-slate-100 font-sans overflow-hidden">
            {/* Announcement Bar */}
            <div className="bg-blue-600 text-white px-6 py-3 text-center text-lg font-medium shadow-md relative z-50">
                <div className="flex items-center justify-center gap-3 animate-pulse">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <span className="tracking-wide">
                        LATIHAN / SIMULASI INTERNAL SEKOLAH - BUKAN TKA RESMI KEMENDIKDASMEN
                    </span>
                </div>
            </div>


            {/* TV Broadcast Header */}
            <header className="bg-white shadow-lg border-b border-slate-200 relative z-40">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-teal-500 tracking-tight">
                                LIVE SCORE MONITORING
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-slate-500 font-medium uppercase tracking-widest text-xs">Real-time Updates • 5s Refresh</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant={autoScroll ? 'default' : 'outline'}
                            size="lg"
                            className={`font-bold tracking-wide ${autoScroll ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            onClick={() => setAutoScroll(!autoScroll)}
                        >
                            <Monitor className="w-5 h-5 mr-2" />
                            AUTO SCROLL: {autoScroll ? 'ON' : 'OFF'}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-180px)] flex flex-col gap-8">
                {/* Stats Cards - Large Visibility */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-6 text-center shadow-md border-t-4 border-blue-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Peserta</p>
                            <p className="text-5xl font-black text-slate-800">{stats.total}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-amber-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Sedang Ujian</p>
                            <p className="text-5xl font-black text-slate-800">{stats.sedang}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-emerald-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Selesai</p>
                            <p className="text-5xl font-black text-slate-800">{stats.selesai}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-slate-300 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Belum Mulai</p>
                            <p className="text-5xl font-black text-slate-800">{stats.belum}</p>
                        </Card>
                    </div>
                )}

                {/* Leaderboard */}
                {/* TV Leaderboard Listing */}
                <div className="flex-1 bg-slate-200/50 rounded-2xl p-2 md:p-4 overflow-hidden shadow-inner border border-slate-300">
                    <div className="flex items-center justify-between px-6 py-3 mb-2 bg-slate-300/50 rounded-lg text-slate-600 font-bold uppercase tracking-wider text-sm sticky top-0 z-10">
                        <div className="w-24">Rank</div>
                        <div className="flex-1">Peserta</div>
                        <div className="w-32 text-center">Status</div>
                        <div className="w-40 text-right">Skor Live</div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="h-full overflow-y-auto pr-2 space-y-3 pb-20 custom-scrollbar"
                    >
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-4">
                                    <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
                                    <p className="text-xl text-slate-500 font-medium">Memuat Data Live Score...</p>
                                </div>
                            ) : scores.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-40">
                                    <Trophy className="w-32 h-32 text-slate-400" />
                                    <p className="text-2xl text-slate-500 font-bold">Belum ada data peserta</p>
                                </div>
                            ) : (
                                scores.map((score, index) => (
                                    <motion.div
                                        key={`${score.nama}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            backgroundColor: score.skor > 0 ? ["#ffffff", "#eff6ff", "#ffffff"] : "#ffffff"
                                        }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.4 }}
                                        className={`
                                            flex items-center justify-between p-4 md:p-6 rounded-xl shadow-sm border-l-8 
                                            ${score.status === 'DISKUALIFIKASI' ? 'bg-red-50 border-red-500' : 'bg-white'}
                                            ${index === 0 ? 'border-yellow-400 ring-2 ring-yellow-400/20 z-10 scale-[1.01]' :
                                                index === 1 ? 'border-slate-300' :
                                                    index === 2 ? 'border-amber-600' : 'border-blue-500'}
                                        `}
                                    >
                                        {/* Rank Badge */}
                                        <div className="w-24 flex items-center gap-4">
                                            {index === 0 ? (
                                                <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 text-2xl animate-bounce">
                                                    🏆
                                                </div>
                                            ) : index === 1 ? (
                                                <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full flex items-center justify-center shadow-md text-xl">
                                                    🥈
                                                </div>
                                            ) : index === 2 ? (
                                                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-md text-white text-xl">
                                                    🥉
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center font-bold text-lg">
                                                    #{index + 1}
                                                </div>
                                            )}
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-bold text-slate-800 mb-1 leading-none">{score.nama}</h3>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                    {score.kelas}
                                                </Badge>
                                                {score.waktu_selesai && (
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Selesai: {score.waktu_selesai}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="w-32 text-center">
                                            <Badge
                                                className={`text-sm px-3 py-1 ${score.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                                    score.status === 'SEDANG' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 animate-pulse' :
                                                        score.status === 'DISKUALIFIKASI' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}
                                            >
                                                {score.status}
                                            </Badge>
                                        </div>

                                        {/* Score - HUGE */}
                                        <div className="w-40 text-right">
                                            <div className={`text-4xl md:text-5xl font-black tracking-tighter ${score.skor >= 80 ? 'text-emerald-600' :
                                                score.skor >= 60 ? 'text-blue-600' :
                                                    score.skor >= 40 ? 'text-amber-500' : 'text-slate-400'
                                                }`}>
                                                {score.skor.toFixed(1)}
                                            </div>
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Total Poin</div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
