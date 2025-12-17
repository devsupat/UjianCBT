'use client';

import { useEffect, useState, useMemo } from 'react';
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
    Loader2,
    Activity,
    Server,
    Wifi,
    Search,
    Zap,
    PlayCircle,
    LogIn,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUsers, resetUserLogin, exportResults } from '@/lib/api';
import type { User } from '@/types';

export default function AdminDashboard() {
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);
    const [resetingUser, setResetingUser] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Filter users by search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(u =>
            u.nama_lengkap.toLowerCase().includes(query) ||
            u.username.toLowerCase().includes(query) ||
            u.kelas?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Generate mock activity feed from users
    const activityFeed = useMemo(() => {
        const activities: { id: string; message: string; type: string; time: string }[] = [];
        const now = new Date();

        users.forEach((user, idx) => {
            if (user.status_ujian === 'SEDANG') {
                activities.push({
                    id: `${user.id_siswa}-sedang`,
                    message: `${user.nama_lengkap} sedang mengerjakan ujian`,
                    type: 'active',
                    time: 'Live'
                });
            } else if (user.status_ujian === 'SELESAI') {
                activities.push({
                    id: `${user.id_siswa}-selesai`,
                    message: `${user.nama_lengkap} menyelesaikan ujian`,
                    type: 'finish',
                    time: user.last_seen || `${idx + 1}m ago`
                });
            } else if (user.status_ujian === 'DISKUALIFIKASI') {
                activities.push({
                    id: `${user.id_siswa}-dq`,
                    message: `${user.nama_lengkap} didiskualifikasi`,
                    type: 'warning',
                    time: user.last_seen || `${idx + 2}m ago`
                });
            }
        });

        return activities.slice(0, 15);
    }, [users]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutate();
        setTimeout(() => setIsRefreshing(false), 500);
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

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'active':
                return <PlayCircle className="w-4 h-4 text-blue-500" />;
            case 'finish':
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'login':
                return <LogIn className="w-4 h-4 text-indigo-500" />;
            default:
                return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 lg:px-12 xl:px-16 py-4">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Admin Command Center</h1>
                            <p className="text-xs text-slate-500">Monitoring & Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/live-score">
                            <Button variant="outline" size="sm">
                                <Activity className="w-4 h-4" />
                                Live Score
                            </Button>
                        </Link>
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

            {/* Message Toast */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg border ${message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                >
                    {message.text}
                </motion.div>
            )}

            {/* Main Content - Full Width with Comfortable Padding */}
            <div className="w-full px-6 lg:px-12 xl:px-16 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Column - Main Content (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Stats Cards - Enhanced */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="p-5 shadow-md relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-20 h-20 -mr-6 -mt-6 opacity-10">
                                        <Users className="w-full h-full text-blue-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                                        <p className="text-xs text-slate-500 mt-1">Total Siswa</p>
                                        <div className="mt-3 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <Card className="p-5 shadow-md relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-20 h-20 -mr-6 -mt-6 opacity-10">
                                        <Clock className="w-full h-full text-amber-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-amber-600" />
                                            </div>
                                            {stats.sedang > 0 && (
                                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-3xl font-bold text-slate-800">{stats.sedang}</p>
                                        <p className="text-xs text-slate-500 mt-1">Sedang Ujian</p>
                                        <div className="mt-3 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: stats.total ? `${(stats.sedang / stats.total) * 100}%` : '0%' }} />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <Card className="p-5 shadow-md relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-20 h-20 -mr-6 -mt-6 opacity-10">
                                        <CheckCircle2 className="w-full h-full text-emerald-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-slate-800">{stats.selesai}</p>
                                        <p className="text-xs text-slate-500 mt-1">Selesai</p>
                                        <div className="mt-3 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: stats.total ? `${(stats.selesai / stats.total) * 100}%` : '0%' }} />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="p-5 shadow-md relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-20 h-20 -mr-6 -mt-6 opacity-10">
                                        <XCircle className="w-full h-full text-red-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-slate-800">{stats.diskualifikasi}</p>
                                        <p className="text-xs text-slate-500 mt-1">Diskualifikasi</p>
                                        <div className="mt-3 h-1.5 bg-red-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: stats.total ? `${(stats.diskualifikasi / stats.total) * 100}%` : '0%' }} />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                <Card className="p-5 shadow-md relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-20 h-20 -mr-6 -mt-6 opacity-10">
                                        <Users className="w-full h-full text-slate-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-slate-500" />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-slate-800">{stats.belum}</p>
                                        <p className="text-xs text-slate-500 mt-1">Belum Mulai</p>
                                        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: stats.total ? `${(stats.belum / stats.total) * 100}%` : '0%' }} />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Users Table */}
                        <Card className="overflow-hidden shadow-lg">
                            <CardHeader className="bg-slate-40 border-b border-slate-100 py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-bold text-slate-800">Monitoring Peserta</CardTitle>
                                    <div className="flex items-center gap-3">
                                        {/* Search Input */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari siswa..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="h-9 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64"
                                            />
                                        </div>
                                        <Badge variant="secondary">{filteredUsers.length} siswa</Badge>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="text-center py-20 text-slate-500">
                                            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                            <p>{searchQuery ? 'Tidak ditemukan hasil pencarian' : 'Belum ada data siswa'}</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-slate-100 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nama</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kelas</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Skor</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Violations</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Seen</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredUsers.map((user) => (
                                                    <tr key={user.id_siswa} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <span className="font-semibold text-slate-800">{user.nama_lengkap}</span>
                                                                <p className="text-xs text-slate-500">{user.username}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{user.kelas}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {getStatusBadge(user.status_ujian)}
                                                            {user.status_login && (
                                                                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" title="Online" />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-semibold text-slate-800">
                                                            {user.skor_akhir !== undefined ? user.skor_akhir.toFixed(1) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {(user.violation_count || 0) > 0 ? (
                                                                <Badge variant="destructive">{user.violation_count}</Badge>
                                                            ) : (
                                                                <span className="text-slate-400">0</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-sm">
                                                            {user.last_seen || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
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
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Sidebar (1 col) */}
                    <div className="space-y-6">
                        {/* Action Panel */}
                        <Card className="shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    onClick={handleRefresh}
                                    variant="outline"
                                    className="w-full justify-start"
                                    disabled={isRefreshing}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    Refresh Data
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    variant="outline"
                                    className="w-full justify-start"
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export CSV
                                </Button>
                                <Link href="/live-score" className="block">
                                    <Button variant="default" className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600">
                                        <Activity className="w-4 h-4" />
                                        Live Score
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* System Health */}
                        <Card className="shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                    <Server className="w-4 h-4" />
                                    System Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm text-slate-600">API Status</span>
                                    </div>
                                    <Badge variant="success">Online</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Wifi className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-slate-600">Active Connections</span>
                                    </div>
                                    <span className="font-semibold text-slate-800">{stats.sedang}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm text-slate-600">Refresh Rate</span>
                                    </div>
                                    <span className="text-sm text-slate-500">10s</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Server className="w-4 h-4 text-indigo-500" />
                                        <span className="text-sm text-slate-600">Server Load</span>
                                    </div>
                                    <Badge variant="secondary">Low</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Live Activity Feed */}
                        <Card className="shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Live Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[300px] overflow-y-auto">
                                    {activityFeed.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-sm">
                                            Belum ada aktivitas
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {activityFeed.map((activity) => (
                                                <div key={activity.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5">
                                                            {getActivityIcon(activity.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-slate-700 truncate">{activity.message}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
