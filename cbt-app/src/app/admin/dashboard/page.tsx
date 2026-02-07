'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    Download,
    RefreshCw,
    RotateCcw,
    Eye,
    Loader2,
    Activity,
    Search,
    PlayCircle,
    TrendingUp,
    AlertCircle,
    Filter,
    ArrowUpDown,
    CircleDashed,
    KeyRound,
    Shuffle,
    Trash2,
    Copy,
    Check
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import StudentDetailDialog from '@/components/StudentDetailDialog';
import { getUsers, resetUserLogin, exportResults, setExamPin, getExamPinStatus, resetTodayExam } from '@/lib/api';
import type { User } from '@/types';

type SortField = 'name' | 'class' | 'status' | 'score';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
    const [isExporting, setIsExporting] = useState(false);
    const [resetingUser, setResetingUser] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Filters
    const [classFilter, setClassFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Reset Exam state
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const { data, isLoading, mutate } = useSWR<{ success: boolean; data?: User[] }>(
        'adminUsers',
        getUsers,
        { refreshInterval: 5000 }
    );

    const users = data?.data || [];

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Stats Calculation
    const stats = useMemo(() => {
        return {
            total: users.length,
            sedang: users.filter(u => u.status_ujian === 'SEDANG').length,
            selesai: users.filter(u => u.status_ujian === 'SELESAI').length,
            diskualifikasi: users.filter(u => u.status_ujian === 'DISKUALIFIKASI').length,
            belum: users.filter(u => u.status_ujian === 'BELUM' || !u.status_ujian).length,
        };
    }, [users]);

    // Get unique classes for filter
    const uniqueClasses = useMemo(() => {
        const classes = users.map(u => u.kelas).filter(Boolean);
        return Array.from(new Set(classes)).sort() as string[];
    }, [users]);

    // Filter and sort users
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users;

        // Apply search filter
        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase();
            filtered = filtered.filter(u =>
                u.nama_lengkap.toLowerCase().includes(query) ||
                u.username.toLowerCase().includes(query) ||
                u.kelas?.toLowerCase().includes(query)
            );
        }

        // Apply class filter
        if (classFilter !== 'all') {
            filtered = filtered.filter(u => u.kelas === classFilter);
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(u => {
                const status = u.status_ujian || 'BELUM';
                return status === statusFilter;
            });
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            let compareResult = 0;

            switch (sortField) {
                case 'name':
                    compareResult = a.nama_lengkap.localeCompare(b.nama_lengkap);
                    break;
                case 'class':
                    compareResult = (a.kelas || '').localeCompare(b.kelas || '');
                    break;
                case 'status':
                    compareResult = (a.status_ujian || 'BELUM').localeCompare(b.status_ujian || 'BELUM');
                    break;
                case 'score':
                    compareResult = (a.skor_akhir || 0) - (b.skor_akhir || 0);
                    break;
            }

            return sortDirection === 'asc' ? compareResult : -compareResult;
        });

        return sorted;
    }, [users, debouncedSearch, classFilter, statusFilter, sortField, sortDirection]);

    const activityFeed = useMemo(() => {
        const activities: Array<{
            type: 'active' | 'finish';
            user: string;
            time: string;
            msg: string;
        }> = [];
        users.forEach(user => {
            if (user.status_ujian === 'SEDANG') {
                activities.push({
                    type: 'active',
                    user: user.nama_lengkap,
                    time: 'Now',
                    msg: 'sedang mengerjakan ujian'
                });
            } else if (user.status_ujian === 'SELESAI') {
                activities.push({
                    type: 'finish',
                    user: user.nama_lengkap,
                    time: user.last_seen || 'Recently',
                    msg: 'telah menyelesaikan ujian'
                });
            }
        });
        return activities.slice(0, 5);
    }, [users]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutate();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await exportResults();
            if (response.success && response.data) {
                const csv = response.data.map(row =>
                    (row as string[]).map(cell => `"${cell}"`).join(',')
                ).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CBT-Export-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
            }
        } catch {
            alert('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetLogin = async (id: string, name: string) => {
        if (!confirm(`Reset login ${name}?`)) return;
        setResetingUser(id);
        const res = await resetUserLogin(id);
        if (res.success) {
            setMessage({ type: 'success', text: `Login ${name} di-reset` });
            mutate();
        }
        setResetingUser(null);
        setTimeout(() => setMessage(null), 3000);
    };

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Handle Reset Today Exam
    const handleResetTodayExam = async () => {
        if (!resetPassword.trim()) {
            setMessage({ type: 'error', text: 'Password admin diperlukan' });
            return;
        }

        setIsResetting(true);
        try {
            const res = await resetTodayExam(resetPassword);
            if (res.success) {
                setMessage({ type: 'success', text: res.message || `Berhasil mereset ${res.data?.resetCount || 0} peserta` });
                setShowResetDialog(false);
                setResetPassword('');
                mutate();
            } else {
                setMessage({ type: 'error', text: res.message || 'Gagal mereset ujian' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal mereset ujian' });
        } finally {
            setIsResetting(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const headerActions = (
        <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white border border-slate-200 rounded-xl px-3 h-10 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                    className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-32 lg:w-48 placeholder:text-slate-400"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-10 border-slate-200 hover:bg-slate-50 text-slate-600">
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="default" size="sm" onClick={handleExport} disabled={isExporting} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 border-0">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                <span className="hidden sm:inline">Export</span>
            </Button>
        </div>
    );

    return (
        <AdminLayout
            title="Dashboard Overview"
            subtitle="Real-time exam monitoring center"
            headerActions={headerActions}
        >
            {/* Toast Message */}
            {message && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right fade-in duration-300 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-1 pointer-events-auto">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="font-medium text-sm">{message.text}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {/* Main Stats Grid - 4 columns max for better readability */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                    {/* Total Students */}
                    <Card className="border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden shadow-xl rounded-2xl">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-blue-100 font-medium text-sm">Total Peserta</span>
                            </div>
                            <h3 className="text-4xl font-bold tracking-tight">{stats.total}</h3>
                            <p className="text-xs text-blue-200 mt-2">Siswa terdaftar</p>
                        </CardContent>
                    </Card>

                    {/* Active Students */}
                    <Card className="border border-slate-100 bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-xl transition-all min-w-0">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-amber-50 rounded-lg flex-shrink-0">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sedang Ujian</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.sedang}</h3>
                            <div className="mt-2 flex items-center gap-1.5">
                                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-medium text-amber-600">Live</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Finished Students */}
                    <Card className="border border-slate-100 bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-xl transition-all min-w-0">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-emerald-50 rounded-lg flex-shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selesai</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.selesai}</h3>
                            <div className="mt-2 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] font-medium text-emerald-600">Completed</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Belum Memulai */}
                    <Card className="border border-slate-100 bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-xl transition-all min-w-0">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-slate-50 rounded-lg flex-shrink-0">
                                    <CircleDashed className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Belum Mulai</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.belum}</h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-2">Standby</p>
                        </CardContent>
                    </Card>

                    {/* Issues/DQ */}
                    <Card className="border border-slate-100 bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-xl transition-all min-w-0">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-rose-50 rounded-lg flex-shrink-0">
                                    <XCircle className="w-4 h-4 text-rose-500" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DQ</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.diskualifikasi}</h3>
                            <p className="text-[10px] font-medium text-rose-500 mt-2">Diskualifikasi</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Area: Table & Activity */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Table Area */}
                    <div className="xl:col-span-2 flex flex-col gap-6">
                        <Card className="border-0 shadow-xl ring-1 ring-slate-200/50 bg-white rounded-2xl overflow-hidden flex-1">
                            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">Monitoring Peserta</h3>
                                        <p className="text-sm text-slate-500">Real-time status tracking</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Class Filter */}
                                        <Select value={classFilter} onValueChange={setClassFilter}>
                                            <SelectTrigger className="w-32 h-9">
                                                <Filter className="w-3 h-3 mr-2" />
                                                <SelectValue placeholder="Kelas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Kelas</SelectItem>
                                                {uniqueClasses.map(kelas => (
                                                    <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Status Filter */}
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-32 h-9">
                                                <Filter className="w-3 h-3 mr-2" />
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Status</SelectItem>
                                                <SelectItem value="BELUM">Belum Mulai</SelectItem>
                                                <SelectItem value="SEDANG">Sedang Ujian</SelectItem>
                                                <SelectItem value="SELESAI">Selesai</SelectItem>
                                                <SelectItem value="DISKUALIFIKASI">Diskualifikasi</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Badge variant="outline" className="bg-white px-3 py-1 text-slate-600 border-slate-200 shadow-sm">
                                            {filteredAndSortedUsers.length} Users
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                {isLoading ? (
                                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold w-[300px]">
                                                    <button
                                                        onClick={() => handleSort('name')}
                                                        className="flex items-center gap-2 hover:text-slate-700 transition-colors"
                                                    >
                                                        User Profile
                                                        <ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                </th>
                                                <th className="px-6 py-4 font-semibold">
                                                    <button
                                                        onClick={() => handleSort('status')}
                                                        className="flex items-center gap-2 hover:text-slate-700 transition-colors"
                                                    >
                                                        Status
                                                        <ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                </th>
                                                <th className="px-6 py-4 font-semibold text-center">
                                                    <button
                                                        onClick={() => handleSort('score')}
                                                        className="flex items-center gap-2 hover:text-slate-700 transition-colors mx-auto"
                                                    >
                                                        Score
                                                        <ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                </th>
                                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredAndSortedUsers.slice(0, 50).map((user) => (
                                                <tr key={user.id_siswa} className="group hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm flex-shrink-0">
                                                                {user.nama_lengkap.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{user.nama_lengkap}</div>
                                                                <div className="text-xs text-slate-500 truncate">{user.kelas} • {user.username}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {user.status_ujian === 'SEDANG' && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                                                                    <Clock className="w-3 h-3" /> <span className="hidden sm:inline">Sedang</span>
                                                                </span>
                                                            )}
                                                            {user.status_ujian === 'SELESAI' && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                                    <CheckCircle2 className="w-3 h-3" /> <span className="hidden sm:inline">Selesai</span>
                                                                </span>
                                                            )}
                                                            {(!user.status_ujian || user.status_ujian === 'BELUM') && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> <span className="hidden sm:inline">Belum</span>
                                                                </span>
                                                            )}
                                                            {user.status_login && (
                                                                <span className="relative flex h-2 w-2 ml-1" title="Online">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {user.skor_akhir !== undefined && user.skor_akhir !== null ? (
                                                            <span className={`text-lg font-bold ${(user.skor_akhir || 0) >= 70 ? 'text-emerald-600' : 'text-slate-700'
                                                                }`}>
                                                                {user.skor_akhir}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600 rounded-lg"
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
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                                                                onClick={() => handleViewDetails(user)}
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

                    {/* Right Column: Activity & System */}
                    <div className="space-y-6">
                        {/* Live Activity Feed */}
                        <Card className="border-0 shadow-xl ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-rose-500" />
                                    Live Activity
                                </h3>
                            </div>
                            <div className="p-6 space-y-6 relative min-h-[200px]">
                                {/* Connecting Line Background */}
                                {activityFeed.length > 0 && <div className="absolute left-[34px] top-10 bottom-10 w-0.5 bg-slate-100 z-0" />}

                                {activityFeed.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 relative z-10">
                                        <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm
                                        ${item.type === 'active' ? 'bg-blue-100 text-blue-600 ring-4 ring-white' : 'bg-emerald-100 text-emerald-600 ring-4 ring-white'}
                                    `}>
                                            {item.type === 'active' ? <PlayCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-slate-800 font-medium truncate">
                                                <span className="font-bold">{item.user}</span> {item.msg}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                                        </div>
                                    </div>
                                ))}
                                {activityFeed.length === 0 && (
                                    <div className="text-center text-slate-400 text-sm py-8 italic">No recent activity</div>
                                )}
                            </div>
                        </Card>

                        {/* Quick System Check - Apple Style */}
                        <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl text-slate-800 shadow-lg ring-1 ring-slate-200/60">
                            <h4 className="font-semibold text-slate-600 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Activity className="w-4 h-4 text-emerald-500" /> System Health
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                                    <p className="text-xs text-slate-500 font-semibold mb-1">API Latency</p>
                                    <p className="text-2xl font-bold text-emerald-500">24<span className="text-xs text-emerald-600/70 ml-1">ms</span></p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                                    <p className="text-xs text-slate-500 font-semibold mb-1">Uptime</p>
                                    <p className="text-2xl font-bold text-blue-500">99.9<span className="text-xs text-blue-600/70 ml-1">%</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Reset Exam Section */}
                        <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl shadow-lg ring-1 ring-rose-200/60">
                            <h4 className="font-semibold text-rose-600 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Trash2 className="w-4 h-4" />
                                Reset Ujian
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">
                                Reset semua status ujian peserta ke BELUM, hapus skor dan data ujian hari ini.
                            </p>
                            {!showResetDialog ? (
                                <Button
                                    variant="outline"
                                    className="w-full border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    onClick={() => setShowResetDialog(true)}
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset Ujian Hari Ini
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <Input
                                        type="password"
                                        placeholder="Masukkan password admin"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        className="border-rose-200 focus:border-rose-400 focus:ring-rose-200"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowResetDialog(false);
                                                setResetPassword('');
                                            }}
                                            disabled={isResetting}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                                            onClick={handleResetTodayExam}
                                            disabled={isResetting}
                                        >
                                            {isResetting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Konfirmasi Reset'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Detail Dialog */}
            <StudentDetailDialog
                user={selectedUser}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onResetLogin={handleResetLogin}
            />
        </AdminLayout>
    );
}
