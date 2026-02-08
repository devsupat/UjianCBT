'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
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
import { resetUserLogin, exportResults, setExamPin, getExamPinStatus, resetTodayExam } from '@/lib/api';
import { fetchStudentProfiles, resetStudentExam } from '@/lib/queries';
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

    // Use Supabase query instead of legacy API
    const { data: users = [], isLoading, mutate } = useSWR<User[]>(
        'studentProfiles',
        fetchStudentProfiles,
        { refreshInterval: 5000 }
    );

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
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                    className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-32 lg:w-48 placeholder:text-slate-400"
                    placeholder="Cari peserta..."
                    aria-label="Search students"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-10 border-slate-200 hover:bg-slate-50 text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Refresh data"
            >
                <RefreshCw className={`w-4 h-4 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
                variant="default"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="btn-premium h-10 border-0"
                aria-label="Export results"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Download className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">Export Results</span>
            </Button>
        </div>
    );


    return (
        <AdminLayout
            title="Dashboard Overview"
            subtitle="Pusat monitoring ujian real-time"
            headerActions={headerActions}
        >
                {/* Premium Toast Message */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, x: 100, y: -20 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-24 right-8 z-50 pointer-events-none"
                        >
                            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-1 pointer-events-auto ring-1 ring-slate-900/5">
                                <div className={`flex items-center gap-4 px-5 py-4 rounded-xl ${message.type === 'success'
                                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border border-rose-200'
                                    }`}>
                                    <div className={`p-2 rounded-xl ${message.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'
                                        }`}>
                                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    </div>
                                    <span className="font-bold text-sm">{message.text}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-8">
                    {/* KPI Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Card className="card-premium h-40 animate-pulse border-0" />
                                </motion.div>
                            ))
                        ) : (
                            <>
                                {/* Total Students - Gradient Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.05 }}
                                    whileHover={{ y: -4 }}
                                    className="col-span-2 lg:col-span-1"
                                >
                                    <Card className="border-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-black/5 hover:shadow-lg transition-shadow rounded-3xl min-h-[110px]">
                                        <CardContent className="px-6 py-4 flex flex-col items-center justify-center gap-4 h-full">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl scale-90 opacity-70">
                                                    <Users className="w-4 h-4 text-white" />
                                                </div>
                                                <p className="text-white/80 font-semibold text-sm uppercase tracking-wide opacity-80">Total Peserta</p>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight text-white">{stats.total}</div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Active Students - Orange Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <Card className="bg-white border border-white/40 shadow-md shadow-black/5 hover:shadow-lg transition-shadow rounded-3xl min-h-[110px]">
                                        <CardContent className="px-6 py-4 flex flex-col items-center justify-center gap-4 h-full">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-orange-100 rounded-xl scale-90 opacity-70">
                                                    <Clock className="w-4 h-4 text-orange-600" />
                                                </div>
                                                <p className="text-slate-600 font-semibold text-sm uppercase tracking-wide opacity-80">Sedang Ujian</p>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight text-slate-900">{stats.sedang}</div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Finished Students - Green Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.15 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <Card className="bg-white border border-white/40 shadow-md shadow-black/5 hover:shadow-lg transition-shadow rounded-3xl min-h-[110px]">
                                        <CardContent className="px-6 py-4 flex flex-col items-center justify-center gap-4 h-full">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-emerald-100 rounded-xl scale-90 opacity-70">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <p className="text-slate-600 font-semibold text-sm uppercase tracking-wide opacity-80">Selesai</p>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight text-slate-900">{stats.selesai}</div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Belum Memulai - Gray Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <Card className="bg-white border border-white/40 shadow-md shadow-black/5 hover:shadow-lg transition-shadow rounded-3xl min-h-[110px]">
                                        <CardContent className="px-6 py-4 flex flex-col items-center justify-center gap-4 h-full">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-100 rounded-xl scale-90 opacity-70">
                                                    <CircleDashed className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <p className="text-slate-600 font-semibold text-sm uppercase tracking-wide opacity-80">Belum Mulai</p>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight text-slate-900">{stats.belum}</div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Diskualifikasi - Red Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.25 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <Card className="bg-white border border-white/40 shadow-md shadow-black/5 hover:shadow-lg transition-shadow rounded-3xl min-h-[110px]">
                                        <CardContent className="px-6 py-4 flex flex-col items-center justify-center gap-4 h-full">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-red-100 rounded-xl scale-90 opacity-70">
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                </div>
                                                <p className="text-slate-600 font-semibold text-sm uppercase tracking-wide opacity-80">Diskualifikasi</p>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight text-slate-900">{stats.diskualifikasi}</div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-12 gap-4 lg:gap-6">
                        {/* Main Monitoring Panel */}
                        <div className="col-span-12 lg:col-span-8">
                            <Card className="border-0 shadow-md shadow-black/5 rounded-3xl overflow-hidden bg-white">
                                <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border-b border-indigo-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                                Monitoring Peserta
                                            </h3>
                                            <p className="text-xs text-slate-600 mt-1 font-medium">Real-time exam tracking</p>
                                        </div>
                                        <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 text-xs font-bold">
                                            {filteredAndSortedUsers.length} Peserta
                                        </Badge>
                                    </div>
                                    
                                    {/* Filters Row */}
                                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                                        <Select value={classFilter} onValueChange={setClassFilter}>
                                            <SelectTrigger className="w-[130px] h-9 text-xs bg-white border-indigo-200 focus:ring-indigo-500">
                                                <Filter className="w-3.5 h-3.5 mr-1.5" />
                                                <SelectValue placeholder="Kelas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Kelas</SelectItem>
                                                {uniqueClasses.map(kelas => (
                                                    <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-indigo-200 focus:ring-indigo-500">
                                                <Filter className="w-3.5 h-3.5 mr-1.5" />
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
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    {isLoading ? (
                                        <div className="py-20 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                                            <p className="text-slate-400 text-sm">Memuat data peserta...</p>
                                        </div>
                                    ) : filteredAndSortedUsers.length === 0 ? (
                                        <div className="py-20 text-center px-6">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Users className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h4 className="font-bold text-slate-700">Tidak ada peserta</h4>
                                            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
                                                Belum ada data tersedia untuk kriteria pencarian/filter ini.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Desktop Table View */}
                                            <table className="hidden sm:table w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b-2 border-slate-200">
                                                    <tr>
                                                        <th className="px-6 py-4 font-bold tracking-wide">
                                                            <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                                                                Peserta <ArrowUpDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </th>
                                                        <th className="px-6 py-4 font-bold tracking-wide">
                                                            <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                                                                Status <ArrowUpDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </th>
                                                        <th className="px-6 py-4 font-bold tracking-wide text-center">
                                                            <button onClick={() => handleSort('score')} className="flex items-center gap-2 hover:text-indigo-600 transition-colors mx-auto">
                                                                Skor <ArrowUpDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </th>
                                                        <th className="px-6 py-4 font-bold tracking-wide text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredAndSortedUsers.slice(0, 50).map((user) => (
                                                        <tr key={user.id_siswa} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                                        {user.nama_lengkap.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900">{user.nama_lengkap}</div>
                                                                        <div className="text-xs text-slate-500">{user.kelas} • {user.username}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {user.status_ujian === 'SEDANG' && (
                                                                        <Badge className="bg-orange-500 text-white hover:bg-orange-600 border-0 px-3 py-1 text-xs font-bold">
                                                                            <Clock className="w-3 h-3 mr-1" /> SEDANG
                                                                        </Badge>
                                                                    )}
                                                                    {user.status_ujian === 'SELESAI' && (
                                                                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-0 px-3 py-1 text-xs font-bold">
                                                                            <CheckCircle2 className="w-3 h-3 mr-1" /> SELESAI
                                                                        </Badge>
                                                                    )}
                                                                    {(!user.status_ujian || user.status_ujian === 'BELUM') && (
                                                                        <Badge variant="outline" className="text-slate-500 border-slate-300 px-3 py-1 text-xs font-bold">
                                                                            BELUM
                                                                        </Badge>
                                                                    )}
                                                                    {user.status_ujian === 'DISKUALIFIKASI' && (
                                                                        <Badge className="bg-red-500 text-white hover:bg-red-600 border-0 px-3 py-1 text-xs font-bold">
                                                                            DISKUALIFIKASI
                                                                        </Badge>
                                                                    )}
                                                                    {user.status_login && (
                                                                        <span className="relative flex h-2 w-2" title="Online">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {user.skor_akhir !== undefined && user.skor_akhir !== null ? (
                                                                    <span className={`text-lg font-black ${(user.skor_akhir || 0) >= 75 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                        {user.skor_akhir}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300 text-lg">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl"
                                                                        onClick={() => handleResetLogin(user.id_siswa, user.nama_lengkap)}
                                                                        disabled={resetingUser === user.id_siswa}
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
                                                                        className="h-9 w-9 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                                                                        onClick={() => handleViewDetails(user)}
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Mobile Card View */}
                                            <div className="sm:hidden grid grid-cols-1 gap-4 p-4">
                                                {filteredAndSortedUsers.slice(0, 50).map((user) => (
                                                    <div key={user.id_siswa} className="card-premium p-5 space-y-4 border-slate-100/60">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                                                                    {user.nama_lengkap.charAt(0)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-slate-800 truncate">{user.nama_lengkap}</div>
                                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{user.kelas} • {user.username}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                {user.skor_akhir !== undefined && user.skor_akhir !== null ? (
                                                                    <div className={`text-xl font-bold ${(user.skor_akhir || 0) >= 75 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                                        {user.skor_akhir}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-slate-300 text-lg">-</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                {user.status_ujian === 'SEDANG' && (
                                                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] h-6">
                                                                        <Clock className="w-3 h-3 mr-1" /> SEDANG
                                                                    </Badge>
                                                                )}
                                                                {user.status_ujian === 'SELESAI' && (
                                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] h-6">
                                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> SELESAI
                                                                    </Badge>
                                                                )}
                                                                {(!user.status_ujian || user.status_ujian === 'BELUM') && (
                                                                    <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] h-6">
                                                                        BELUM MULAI
                                                                    </Badge>
                                                                )}
                                                                {user.status_ujian === 'DISKUALIFIKASI' && (
                                                                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] h-6">
                                                                        DISKUALIFIKASI
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 text-slate-500 bg-slate-50 border border-slate-100 rounded-lg"
                                                                    onClick={() => handleResetLogin(user.id_siswa, user.nama_lengkap)}
                                                                    disabled={resetingUser === user.id_siswa}
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 text-slate-500 bg-slate-50 border border-slate-100 rounded-lg"
                                                                    onClick={() => handleViewDetails(user)}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Right Sidebar Panels */}
                        <div className="col-span-12 lg:col-span-4 space-y-4">
                            {/* Live Activity Feed */}
                            <Card className="border-0 shadow-md shadow-black/5 rounded-3xl overflow-hidden bg-white">
                                <div className="p-5 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100">
                                    <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
                                        <Activity className="w-5 h-5 text-rose-500" />
                                        Aktivitas Terkini
                                    </h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    {isLoading ? (
                                        <div className="space-y-3">
                                            {Array(3).fill(0).map((_, i) => (
                                                <div key={i} className="flex gap-3 animate-pulse">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-xl" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-3 bg-slate-100 rounded w-full" />
                                                        <div className="h-2 bg-slate-50 rounded w-1/2" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : activityFeed.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <CircleDashed className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium">Belum ada aktivitas</p>
                                        </div>
                                    ) : (
                                        activityFeed.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                    item.type === 'active' 
                                                        ? 'bg-blue-100 text-blue-600' 
                                                        : 'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                    {item.type === 'active' ? <PlayCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-700 font-medium">
                                                        <span className="font-bold text-slate-900">{item.user}</span>
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{item.msg}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{item.time}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>

                            {/* System Health */}
                            <Card className="border-0 shadow-md shadow-black/5 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
                                <div className="p-5">
                                    <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm">
                                        <Activity className="w-4 h-4 text-emerald-600" /> System Health
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-emerald-100 shadow-sm">
                                            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Latency</p>
                                            <p className="text-2xl font-black text-emerald-600">24<span className="text-xs ml-1">ms</span></p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-indigo-100 shadow-sm">
                                            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Uptime</p>
                                            <p className="text-2xl font-black text-indigo-600">99.9<span className="text-xs ml-1">%</span></p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Reset Exam Section */}
                            <Card className="border-0 shadow-md shadow-black/5 rounded-3xl overflow-hidden bg-gradient-to-br from-red-50 to-rose-50">
                                <div className="p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 bg-red-100 rounded-xl">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-red-700 text-sm">Reset Ujian Hari Ini</h4>
                                            <p className="text-xs text-red-600/80 mt-1 leading-relaxed">
                                                Aksi ini akan menghapus semua skor dan mereset status peserta ke BELUM MULAI.
                                            </p>
                                        </div>
                                    </div>
                                    {!showResetDialog ? (
                                        <Button
                                            variant="outline"
                                            className="w-full border-red-300 text-red-700 hover:bg-red-100 bg-white text-xs font-bold h-10 rounded-xl"
                                            onClick={() => setShowResetDialog(true)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Reset Ujian Sekarang
                                        </Button>
                                    ) : (
                                        <div className="space-y-3">
                                            <Input
                                                type="password"
                                                placeholder="Password Admin"
                                                value={resetPassword}
                                                onChange={(e) => setResetPassword(e.target.value)}
                                                className="h-10 text-xs border-red-200 focus:border-red-400 focus:ring-red-200 bg-white rounded-xl"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 text-xs font-bold h-9 text-slate-500 hover:bg-white rounded-xl"
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
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9 shadow-md rounded-xl"
                                                    onClick={handleResetTodayExam}
                                                    disabled={isResetting}
                                                >
                                                    {isResetting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        'Konfirmasi'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
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
