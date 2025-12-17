'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    FileQuestion,
    Settings,
    Download,
    RefreshCw,
    LogOut,
    RotateCcw,
    Eye,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUsers, resetUserLogin, exportResults } from '@/lib/api';
import type { User } from '@/types';

export default function AdminDashboard() {
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);
    const [resetingUser, setResetingUser] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const auth = sessionStorage.getItem('admin_auth');
        if (auth !== 'true') {
            router.replace('/admin');
        }
    }, [router]);

    const { data, isLoading, mutate } = useSWR<{ success: boolean; data?: User[] }>(
        'adminUsers',
        getUsers,
        { refreshInterval: 10000 }
    );

    const users = data?.data || [];

    const stats = {
        total: users.length,
        sedang: users.filter(u => u.status_ujian === 'SEDANG').length,
        selesai: users.filter(u => u.status_ujian === 'SELESAI').length,
        diskualifikasi: users.filter(u => u.status_ujian === 'DISKUALIFIKASI').length,
        belum: users.filter(u => u.status_ujian === 'BELUM' || !u.status_ujian).length,
    };

    const handleResetLogin = async (id_siswa: string, nama: string) => {
        if (!confirm(`Reset login untuk ${nama}?`)) return;

        setResetingUser(id_siswa);
        setMessage(null);

        try {
            const response = await resetUserLogin(id_siswa);

            if (response.success) {
                setMessage({ type: 'success', text: `Login ${nama} berhasil di-reset` });
                mutate();
            } else {
                setMessage({ type: 'error', text: response.message || 'Gagal reset login' });
            }
        } catch (error) {
            console.error('Reset login error:', error);
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat reset login' });
        } finally {
            setResetingUser(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await exportResults();
            if (response.success && response.data) {
                const csv = response.data.map(row =>
                    (row as string[]).map(cell =>
                        typeof cell === 'string' && cell.includes(',')
                            ? `"${cell}"`
                            : cell
                    ).join(',')
                ).join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hasil-ujian-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export gagal');
        } finally {
            setIsExporting(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_auth');
        router.push('/admin');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SEDANG':
                return <Badge variant="warning">{status}</Badge>;
            case 'SELESAI':
                return <Badge variant="success">{status}</Badge>;
            case 'DISKUALIFIKASI':
                return <Badge variant="destructive">{status}</Badge>;
            default:
                return <Badge variant="secondary">BELUM</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>

                    <div className="flex items-center gap-3">
                        <Link href="/admin/questions">
                            <Button variant="outline" size="sm">
                                <FileQuestion className="w-4 h-4" />
                                Kelola Soal
                            </Button>
                        </Link>
                        <Link href="/admin/config">
                            <Button variant="outline" size="sm">
                                <Settings className="w-4 h-4" />
                                Pengaturan
                            </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="p-4 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                                    <p className="text-xs text-slate-500">Total Siswa</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="p-4 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{stats.sedang}</p>
                                    <p className="text-xs text-slate-500">Sedang Ujian</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="p-4 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{stats.selesai}</p>
                                    <p className="text-xs text-slate-500">Selesai</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="p-4 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{stats.diskualifikasi}</p>
                                    <p className="text-xs text-slate-500">Diskualifikasi</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="p-4 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{stats.belum}</p>
                                    <p className="text-xs text-slate-500">Belum Mulai</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Message Toast */}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mb-4 p-4 rounded-lg border ${message.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                    <Button onClick={() => mutate()} variant="outline">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                    <Button onClick={handleExport} variant="outline" disabled={isExporting}>
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Export CSV
                    </Button>
                </div>

                {/* Users Table */}
                <Card className="overflow-hidden shadow-lg">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">Monitoring Peserta</h2>
                    </div>

                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p>Belum ada data siswa</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kelas</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Skor</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Violations</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Seen</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((user) => (
                                        <tr key={user.id_siswa} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <span className="font-semibold text-slate-800">{user.nama_lengkap}</span>
                                                    <p className="text-xs text-slate-500">{user.username}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{user.kelas}</td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(user.status_ujian)}
                                                {user.status_login && (
                                                    <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" title="Online" />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-semibold text-slate-800">
                                                {user.skor_akhir !== undefined ? user.skor_akhir.toFixed(1) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {(user.violation_count || 0) > 0 ? (
                                                    <Badge variant="destructive">{user.violation_count}</Badge>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {user.last_seen || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleResetLogin(user.id_siswa, user.nama_lengkap)}
                                                        disabled={resetingUser === user.id_siswa}
                                                        title="Reset Login"
                                                    >
                                                        {resetingUser === user.id_siswa ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
