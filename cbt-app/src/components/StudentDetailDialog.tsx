'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Mail,
    BookOpen,
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    TrendingUp,
    Calendar,
    Activity
} from 'lucide-react';
import type { User as UserType } from '@/types';

interface StudentDetailDialogProps {
    user: UserType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResetLogin?: (id: string, name: string) => void;
}

export default function StudentDetailDialog({
    user,
    open,
    onOpenChange,
    onResetLogin
}: StudentDetailDialogProps) {
    if (!user) return null;

    const getStatusBadge = (status: string | null | undefined) => {
        switch (status) {
            case 'SEDANG':
                return (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Sedang Ujian
                    </Badge>
                );
            case 'SELESAI':
                return (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selesai
                    </Badge>
                );
            case 'DISKUALIFIKASI':
                return (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                        <XCircle className="w-3 h-3 mr-1" />
                        Diskualifikasi
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                        Belum Memulai
                    </Badge>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-premium rounded-[2rem]">
                <DialogHeader className="p-10 pb-0">
                    <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg border border-white/20 flex-shrink-0">
                            {user.nama_lengkap.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 pt-2">
                            <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">{user.nama_lengkap}</DialogTitle>
                            <DialogDescription className="flex items-center gap-3 mt-2 text-slate-500 font-medium">
                                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">@{user.username}</span>
                                {user.status_login && (
                                    <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Sesi Aktif
                                    </span>
                                )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-10 pt-6 space-y-8">
                    {/* Status Section */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Status Ujian</span>
                            {getStatusBadge(user.status_ujian)}
                        </div>
                    </div>

                    {/* Profile Information */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Kelas</span>
                            </div>
                            <p className="text-lg font-bold text-slate-800">{user.kelas || '-'}</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <User className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Username</span>
                            </div>
                            <p className="text-lg font-bold text-slate-800">{user.username}</p>
                        </div>
                    </div>

                    {/* Score Section */}
                    {user.skor_akhir !== undefined && user.skor_akhir !== null && (
                        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Skor Akhir</span>
                                    </div>
                                    <p className="text-4xl font-bold text-blue-700">{user.skor_akhir}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-blue-600">
                                        {user.skor_akhir >= 70 ? '✓ Lulus' : '✗ Tidak Lulus'}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-1">Passing Grade: 70</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Informasi Tambahan
                        </h4>
                        <div className="grid gap-2 text-sm">
                            {user.last_seen && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-600">Last Seen:</span>
                                    <span className="font-medium text-slate-800">{user.last_seen}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">ID Siswa:</span>
                                <span className="font-mono text-xs font-medium text-slate-800">{user.id_siswa}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 bg-slate-50/50 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            className="w-full sm:w-auto text-slate-500 font-semibold"
                            onClick={() => onOpenChange(false)}
                        >
                            Tutup
                        </Button>
                        {onResetLogin && (
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto border-amber-200 hover:bg-amber-50 text-amber-700 hover:text-amber-800 font-semibold shadow-sm"
                                onClick={() => {
                                    onResetLogin(user.id_siswa, user.nama_lengkap);
                                    onOpenChange(false);
                                }}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset Login
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
