'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    Info,
    Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLiveScore, getUsers } from '@/lib/api';
import type { LiveScoreEntry, LiveScoreStats, User } from '@/types';

const PIN_CODE = process.env.NEXT_PUBLIC_LIVE_SCORE_PIN || '2026';

// Combined score entry for leaderboard
interface LeaderboardEntry {
    id: string;
    nama: string;
    kelas: string;
    skor: number;
    status: 'SELESAI' | 'DISKUALIFIKASI' | 'SEDANG' | 'BELUM';
    waktu_selesai?: string;
    isLive: boolean;
}

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

    // Fetch live scores (finished students with accurate scores)
    const { data: liveScoreData, isLoading: isLoadingScores } = useSWR<{
        success: boolean;
        data?: LiveScoreEntry[];
        stats?: LiveScoreStats
    }>(
        isUnlocked ? 'liveScore' : null,
        getLiveScore,
        {
            refreshInterval: 3000,
            revalidateOnFocus: true,
        }
    );

    // Fetch all users (includes SEDANG students for real-time racing)
    const { data: usersData, isLoading: isLoadingUsers } = useSWR<{
        success: boolean;
        data?: User[];
    }>(
        isUnlocked ? 'allUsers' : null,
        getUsers,
        {
            refreshInterval: 3000,
            revalidateOnFocus: true,
        }
    );

    const isLoading = isLoadingScores || isLoadingUsers;

    // Merge data: combine liveScore (finished) with users (includes SEDANG)
    const leaderboard = useMemo((): LeaderboardEntry[] => {
        const entries: LeaderboardEntry[] = [];
        const addedNames = new Set<string>();

        // First, add all users from getUsers (includes SEDANG students)
        if (usersData?.data) {
            usersData.data.forEach(user => {
                if (user.status_ujian === 'SEDANG' || user.status_ujian === 'SELESAI' || user.status_ujian === 'DISKUALIFIKASI') {
                    entries.push({
                        id: user.id_siswa,
                        nama: user.nama_lengkap,
                        kelas: user.kelas,
                        skor: user.skor_akhir || 0,
                        status: user.status_ujian,
                        waktu_selesai: user.waktu_selesai,
                        isLive: user.status_ujian === 'SEDANG',
                    });
                    addedNames.add(user.nama_lengkap);
                }
            });
        }

        // Then update/add from liveScore data (more accurate scores for finished)
        if (liveScoreData?.data) {
            liveScoreData.data.forEach(score => {
                const existingIndex = entries.findIndex(e => e.nama === score.nama);
                if (existingIndex >= 0) {
                    // Update with more accurate live score data
                    entries[existingIndex].skor = score.skor;
                    entries[existingIndex].status = score.status;
                    entries[existingIndex].waktu_selesai = score.waktu_selesai;
                    entries[existingIndex].isLive = score.status === 'SEDANG';
                } else if (!addedNames.has(score.nama)) {
                    entries.push({
                        id: score.nama,
                        nama: score.nama,
                        kelas: score.kelas,
                        skor: score.skor,
                        status: score.status,
                        waktu_selesai: score.waktu_selesai,
                        isLive: score.status === 'SEDANG',
                    });
                }
            });
        }

        // Sort by score descending (racing leaderboard)
        return entries.sort((a, b) => b.skor - a.skor);
    }, [liveScoreData?.data, usersData?.data]);

    // Stats from liveScore or calculate from users
    const stats = useMemo(() => {
        if (liveScoreData?.stats) return liveScoreData.stats;
        if (!usersData?.data) return undefined;
        const users = usersData.data;
        return {
            total: users.length,
            sedang: users.filter(u => u.status_ujian === 'SEDANG').length,
            selesai: users.filter(u => u.status_ujian === 'SELESAI').length,
            diskualifikasi: users.filter(u => u.status_ujian === 'DISKUALIFIKASI').length,
            belum: users.filter(u => u.status_ujian === 'BELUM').length,
        };
    }, [liveScoreData?.stats, usersData?.data]);

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
    }, [autoScroll, leaderboard]);

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

            {/* Header */}
            <header className="bg-white shadow-lg border-b border-slate-200 relative z-40">
                <div className="w-full px-6 py-6 flex items-center justify-between">
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
                                <p className="text-slate-500 font-medium uppercase tracking-widest text-xs">Real-time Updates • 3s Refresh</p>
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

            <div className="w-full px-6 py-8 h-[calc(100vh-180px)] flex flex-col gap-8">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                        <Card className="p-6 text-center shadow-md border-t-4 border-blue-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Peserta</p>
                            <p className="text-5xl font-black text-slate-800">{stats.total}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-amber-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sedang Ujian</p>
                            </div>
                            <p className="text-5xl font-black text-amber-600">{stats.sedang}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-emerald-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Selesai</p>
                            <p className="text-5xl font-black text-slate-800">{stats.selesai}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-red-500 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Diskualifikasi</p>
                            <p className="text-5xl font-black text-red-600">{stats.diskualifikasi}</p>
                        </Card>
                        <Card className="p-6 text-center shadow-md border-t-4 border-slate-300 bg-white transform hover:scale-105 transition-transform duration-300">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Belum Mulai</p>
                            <p className="text-5xl font-black text-slate-800">{stats.belum}</p>
                        </Card>
                    </div>
                )}

                {/* Leaderboard */}
                <div className="flex-1 bg-slate-200/50 rounded-2xl p-2 md:p-4 overflow-hidden shadow-inner border border-slate-300">
                    <div className="flex items-center justify-between px-6 py-3 mb-2 bg-slate-300/50 rounded-lg text-slate-600 font-bold uppercase tracking-wider text-sm sticky top-0 z-10">
                        <div className="w-16 text-center">No</div>
                        <div className="flex-1">Nama</div>
                        <div className="w-24 text-center">Kelas</div>
                        <div className="w-32 text-center">Skor</div>
                        <div className="w-20 text-center">Rank</div>
                        <div className="w-32 text-center">Status</div>
                        <div className="w-32 text-right">Waktu</div>
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
                            ) : leaderboard.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-40">
                                    <Trophy className="w-32 h-32 text-slate-400" />
                                    <p className="text-2xl text-slate-500 font-bold">Belum ada peserta yang memulai ujian</p>
                                </div>
                            ) : (
                                leaderboard.map((entry, index) => (
                                    <motion.div
                                        key={entry.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            backgroundColor: entry.isLive ? ["#ffffff", "#dbeafe", "#ffffff"] : "#ffffff"
                                        }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.4 }}
                                        className={`
                                            flex items-center justify-between p-4 md:p-6 rounded-xl shadow-sm border-l-8 
                                            ${entry.status === 'DISKUALIFIKASI' ? 'bg-red-50 border-red-500' :
                                                entry.isLive ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/30' :
                                                    index === 0 ? 'border-yellow-400 ring-2 ring-yellow-400/20 bg-amber-50 z-10 scale-[1.01]' :
                                                        index === 1 ? 'border-slate-300 bg-white' :
                                                            index === 2 ? 'border-amber-600 bg-white' : 'border-blue-500 bg-white'}
                                        `}
                                    >
                                        {/* No (Sequential Number) */}
                                        <div className="w-16 text-center">
                                            <span className={`text-lg font-bold ${entry.isLive ? 'text-blue-600' : 'text-slate-500'}`}>
                                                {index + 1}
                                            </span>
                                        </div>

                                        {/* Nama */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {entry.isLive && (
                                                    <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                                )}
                                                <h3 className="text-xl font-bold text-slate-800 leading-none">{entry.nama}</h3>
                                            </div>
                                            {entry.isLive && (
                                                <p className="text-sm text-blue-600 font-medium mt-1">Sedang mengerjakan ujian...</p>
                                            )}
                                        </div>

                                        {/* Kelas */}
                                        <div className="w-24 text-center">
                                            <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                {entry.kelas}
                                            </Badge>
                                        </div>

                                        {/* Skor */}
                                        <div className="w-32 text-center">
                                            <div className={`text-3xl font-black tracking-tighter ${entry.skor >= 80 ? 'text-emerald-600' :
                                                entry.skor >= 60 ? 'text-blue-600' :
                                                    entry.skor >= 40 ? 'text-amber-500' : 'text-slate-400'
                                                }`}>
                                                {entry.skor.toFixed(1)}
                                            </div>
                                        </div>

                                        {/* Rank (Medal/Position) */}
                                        <div className="w-20 flex justify-center">
                                            {index === 0 ? (
                                                <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 text-lg">
                                                    🥇
                                                </div>
                                            ) : index === 1 ? (
                                                <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full flex items-center justify-center shadow-md text-lg">
                                                    🥈
                                                </div>
                                            ) : index === 2 ? (
                                                <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-md text-white text-lg">
                                                    🥉
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 font-medium">-</span>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="w-32 text-center">
                                            <Badge
                                                className={`text-sm px-3 py-1 ${entry.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                                    entry.status === 'SEDANG' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                                        entry.status === 'DISKUALIFIKASI' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}
                                            >
                                                {entry.isLive && <Play className="w-3 h-3 mr-1 inline animate-pulse" />}
                                                {entry.status}
                                            </Badge>
                                        </div>

                                        {/* Waktu */}
                                        <div className="w-32 text-right">
                                            {entry.isLive ? (
                                                <span className="text-blue-600 font-medium text-sm">Live...</span>
                                            ) : (
                                                <span className="text-slate-500 text-sm">{entry.waktu_selesai || '-'}</span>
                                            )}
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
