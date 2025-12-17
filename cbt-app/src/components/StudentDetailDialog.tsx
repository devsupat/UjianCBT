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

    const getStatusBadge = (status: string | null) => {
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                            {user.nama_lengkap.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-2xl">{user.nama_lengkap}</DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-1">
                                <span>{user.username}</span>
                                {user.status_login && (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Online
                                    </span>
                                )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-6">
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
                    {user.skor_akhir !== undefined && (
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

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        {onResetLogin && (
                            <Button
                                variant="outline"
                                className="flex-1 border-amber-200 hover:bg-amber-50 text-amber-700 hover:text-amber-800"
                                onClick={() => {
                                    onResetLogin(user.id_siswa, user.nama_lengkap);
                                    onOpenChange(false);
                                }}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset Login
                            </Button>
                        )}
                        <Button
                            variant="default"
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => onOpenChange(false)}
                        >
                            Tutup
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
