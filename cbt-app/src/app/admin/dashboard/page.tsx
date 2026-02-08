'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
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
    AlertCircle,
    ArrowUpDown,
    CircleDashed,
    Trash2,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import ExamControlPanel from '@/components/ExamControlPanel';
import { exportResults } from '@/lib/api';
import {
    fetchStudentProfiles,
    fetchExamSettings,
    updateExamToken,
    updateActivePackets,
    resetStudentLogin,
    resetStudentExam,
    resetAllExamsToday
} from '@/lib/queries';
import { getSupabase } from '@/lib/supabase';
import type { User } from '@/types';

/**
 * Admin Dashboard - CBT Admin 2.0
 * Designed for teachers aged 35-50
 * - Large, readable stats cards
 * - Clear status indicators
 * - Spacious table layout
 * - Intuitive filtering
 */

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

    // Fetch data from Supabase
    const { data: users = [], isLoading, mutate } = useSWR<User[]>(
        'studentProfiles',
        fetchStudentProfiles,
        { refreshInterval: 5000 }
    );

    // Fetch exam settings
    const { data: examSettings, isLoading: isLoadingExam, mutate: mutateExam } = useSWR(
        'examSettings',
        fetchExamSettings,
        { refreshInterval: 10000 }
    );

    // Supabase Realtime subscription for live updates
    useEffect(() => {
        const supabase = getSupabase();

        const channel = supabase
            .channel('monitor-room')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => {
                    console.log('📡 Realtime: profiles changed');
                    mutate();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [mutate]);

    // Exam settings handlers
    const handleUpdateToken = async (token: string) => {
        await updateExamToken(token);
        mutateExam();
    };

    const handleUpdatePackets = async (packets: { paket_a: boolean; paket_b: boolean; paket_c: boolean }) => {
        await updateActivePackets(packets);
        mutateExam();
    };

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

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase();
            filtered = filtered.filter(u =>
                u.nama_lengkap.toLowerCase().includes(query) ||
                u.username.toLowerCase().includes(query) ||
                u.kelas?.toLowerCase().includes(query)
            );
        }

        if (classFilter !== 'all') {
            filtered = filtered.filter(u => u.kelas === classFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(u => {
                const status = u.status_ujian || 'BELUM';
                return status === statusFilter;
            });
        }

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

    // Activity feed
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
                    time: 'Sekarang',
                    msg: 'sedang mengerjakan ujian'
                });
            } else if (user.status_ujian === 'SELESAI') {
                activities.push({
                    type: 'finish',
                    user: user.nama_lengkap,
                    time: user.last_seen || 'Baru saja',
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
            setMessage({ type: 'error', text: 'Export gagal' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetLogin = async (id: string, name: string) => {
        if (!confirm(`Reset login ${name}?`)) return;
        setResetingUser(id);

        // OPTIMISTIC UPDATE: Update UI immediately
        mutate(
            (currentData: User[] | undefined) =>
                currentData?.map(u =>
                    u.id_siswa === id
                        ? { ...u, status_login: false, is_login: false }
                        : u
                ),
            false // Don't revalidate yet
        );

        try {
            const res = await resetStudentLogin(id);
            if (res.success) {
                setMessage({ type: 'success', text: `Login ${name} berhasil direset` });
            } else {
                setMessage({ type: 'error', text: res.error || 'Gagal mereset login' });
                mutate(); // Revert on error
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal mereset login' });
            mutate(); // Revert on error
        }
        setResetingUser(null);
        setTimeout(() => setMessage(null), 3000);
    };

    // RESET EXAM - Comprehensive reset with optimistic update
    const handleResetExam = async (id: string, name: string) => {
        if (!confirm(`Reset ujian ${name}? Ini akan menghapus semua jawaban dan skor.`)) return;
        setResetingUser(id);

        // OPTIMISTIC UPDATE: Update UI immediately
        mutate(
            (currentData: User[] | undefined) =>
                currentData?.map(u =>
                    u.id_siswa === id
                        ? {
                            ...u,
                            status_ujian: 'BELUM' as const,
                            status_login: false,
                            is_login: false,
                            skor_akhir: null,
                            waktu_mulai: null
                        }
                        : u
                ),
            false
        );

        try {
            const res = await resetStudentExam(id);
            if (res.success) {
                setMessage({ type: 'success', text: `Ujian ${name} berhasil direset` });
            } else {
                setMessage({ type: 'error', text: res.error || 'Gagal mereset ujian' });
                mutate(); // Revert on error
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal mereset ujian' });
            mutate(); // Revert on error
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

    const handleResetTodayExam = async () => {
        if (!resetPassword.trim()) {
            setMessage({ type: 'error', text: 'Password admin diperlukan' });
            return;
        }
        // TODO: Verify admin password before reset
        // For now, just check it's not empty (password verification can be done via Supabase)
        setIsResetting(true);
        try {
            const res = await resetAllExamsToday();
            if (res.success) {
                setMessage({ type: 'success', text: `Berhasil mereset ${res.resetCount || 0} peserta` });
                setShowResetDialog(false);
                setResetPassword('');
                mutate();
            } else {
                setMessage({ type: 'error', text: res.error || 'Gagal mereset ujian' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal mereset ujian' });
        } finally {
            setIsResetting(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    // Status badge helper
    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'SEDANG':
                return (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                        <Clock className="w-3 h-3 mr-1" />
                        Sedang Ujian
                    </Badge>
                );
            case 'SELESAI':
                return (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selesai
                    </Badge>
                );
            case 'DISKUALIFIKASI':
                return (
                    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                        <XCircle className="w-3 h-3 mr-1" />
                        Diskualifikasi
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-gray-500 border-gray-200">
                        <CircleDashed className="w-3 h-3 mr-1" />
                        Belum Mulai
                    </Badge>
                );
        }
    };

    // Header actions
    const headerActions = (
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
            >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            <Button
                variant="primary"
                onClick={handleExport}
                disabled={isExporting}
            >
                {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                <span className="ml-2">Export</span>
            </Button>
        </div>
    );

    return (
        <AdminLayout
            title="Dashboard"
            subtitle="Pantau ujian secara realtime"
            headerActions={headerActions}
        >
            {/* Toast Message */}
            {message && (
                <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border
                    ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="font-medium">{message.text}</span>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Exam Control Panel - Smart Exam Features */}
                <ExamControlPanel
                    examToken={examSettings?.exam_token || null}
                    activePackets={examSettings?.active_packets || null}
                    onUpdateToken={handleUpdateToken}
                    onUpdatePackets={handleUpdatePackets}
                    isLoading={isLoadingExam}
                />

                {/* Stats Cards - Large & Clear */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Total */}
                    <Card className="col-span-2 lg:col-span-1">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Total Peserta</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? '-' : stats.total}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sedang Ujian */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Sedang Ujian</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? '-' : stats.sedang}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selesai */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Selesai</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? '-' : stats.selesai}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Belum Mulai */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <CircleDashed className="w-6 h-6 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Belum Mulai</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? '-' : stats.belum}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Diskualifikasi */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Diskualifikasi</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading ? '-' : stats.diskualifikasi}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Participant Table */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <CardTitle className="flex items-center gap-3">
                                    Daftar Peserta
                                    <Badge variant="outline" className="font-normal">
                                        {filteredAndSortedUsers.length} peserta
                                    </Badge>
                                </CardTitle>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-3 mt-4">
                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Cari nama atau username..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <Select value={classFilter} onValueChange={setClassFilter}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Semua Kelas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kelas</SelectItem>
                                        {uniqueClasses.map((cls) => (
                                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Semua Status" />
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
                        </CardHeader>

                        <CardContent className="pt-0">
                            {isLoading ? (
                                <div className="py-16 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                                    <p className="text-gray-500">Memuat data...</p>
                                </div>
                            ) : filteredAndSortedUsers.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Tidak ada peserta</p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Coba ubah filter pencarian
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto -mx-6">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100">
                                                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500">
                                                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-gray-900">
                                                        Nama <ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                </th>
                                                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500">
                                                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-gray-900">
                                                        Status <ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                </th>
                                                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-500">
                                                    <button onClick={() => handleSort('score')} className="flex items-center gap-1 hover:text-gray-900 mx-auto">
                                                        Skor <ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                </th>
                                                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-500">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredAndSortedUsers.slice(0, 50).map((user) => (
                                                <tr key={user.id_siswa} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                                {user.nama_lengkap.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{user.nama_lengkap}</p>
                                                                <p className="text-sm text-gray-500">{user.kelas} • {user.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(user.status_ujian)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {user.skor_akhir !== undefined && user.skor_akhir !== null ? (
                                                            <span className={`text-xl font-bold ${(user.skor_akhir || 0) >= 75 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                                {user.skor_akhir}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleResetLogin(user.id_siswa, user.nama_lengkap)}
                                                                disabled={resetingUser === user.id_siswa}
                                                                title="Reset Login"
                                                                className="text-gray-500 hover:text-blue-600"
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
                                                                onClick={() => handleResetExam(user.id_siswa, user.nama_lengkap)}
                                                                disabled={resetingUser === user.id_siswa}
                                                                title="Reset Ujian"
                                                                className="text-gray-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleViewDetails(user)}
                                                                title="Lihat Detail"
                                                                className="text-gray-500 hover:text-gray-900"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Activity Feed */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                    Aktivitas Terkini
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex gap-3 animate-pulse">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-gray-100 rounded w-full" />
                                                    <div className="h-2 bg-gray-50 rounded w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : activityFeed.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <CircleDashed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">Belum ada aktivitas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activityFeed.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'active'
                                                    ? 'bg-amber-100 text-amber-600'
                                                    : 'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                    {item.type === 'active' ? (
                                                        <PlayCircle className="w-4 h-4" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-900 font-medium truncate">{item.user}</p>
                                                    <p className="text-xs text-gray-500">{item.msg}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Reset Exam Section */}
                        <Card className="border-red-100 bg-red-50/50">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-red-700">Reset Ujian Hari Ini</h4>
                                        <p className="text-sm text-red-600/80 mt-1">
                                            Menghapus semua skor dan mereset status ke Belum Mulai.
                                        </p>
                                    </div>
                                </div>

                                {!showResetDialog ? (
                                    <Button
                                        variant="outline"
                                        className="w-full border-red-200 text-red-700 hover:bg-red-100"
                                        onClick={() => setShowResetDialog(true)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Reset Ujian
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <Input
                                            type="password"
                                            placeholder="Password Admin"
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            className="border-red-200 focus:border-red-400"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
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
                                                variant="destructive"
                                                className="flex-1"
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
                            </CardContent>
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
