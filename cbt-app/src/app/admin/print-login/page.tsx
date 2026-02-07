'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
    Printer,
    RefreshCw,
    Loader2,
    CheckSquare,
    Square,
    Filter
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getConfig } from '@/lib/api';
import { fetchStudentProfiles } from '@/lib/queries';
import type { UserForPrint, ExamConfig } from '@/types';

export default function PrintLoginPage() {
    const [classFilter, setClassFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Use Supabase query for student profiles
    const { data: users = [], isLoading, mutate } = useSWR(
        'usersForPrint',
        async () => {
            const profiles = await fetchStudentProfiles();
            // Transform to UserForPrint format (add password field)
            return profiles.map(p => ({
                ...p,
                password: 'default123' // TODO: generate or fetch from auth
            }));
        }
    );

    const { data: configData } = useSWR<{ success: boolean; data?: ExamConfig }>(
        'examConfig',
        getConfig
    );

    const examName = configData?.data?.exam_name || 'UJIAN';

    const uniqueClasses = useMemo(() => {
        const classes = users.map(u => u.kelas).filter(Boolean);
        return Array.from(new Set(classes)).sort() as string[];
    }, [users]);

    const filteredUsers = useMemo(() => {
        if (classFilter === 'all') return users;
        return users.filter(u => u.kelas === classFilter);
    }, [users, classFilter]);

    const usersToPrint = useMemo(() => {
        if (selectedIds.size === 0) return filteredUsers;
        return filteredUsers.filter(u => selectedIds.has(u.id_siswa));
    }, [filteredUsers, selectedIds]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutate();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredUsers.map(u => u.id_siswa)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    const handlePrint = () => {
        window.print();
    };

    const headerActions = (
        <div className="flex items-center gap-3 no-print">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-10">
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                className="h-10 bg-violet-600 hover:bg-violet-700"
                disabled={usersToPrint.length === 0}
            >
                <Printer className="w-4 h-4 mr-2" />
                Cetak ({usersToPrint.length})
            </Button>
        </div>
    );

    return (
        <>
            {/* Embedded Print Styles */}
            <style jsx global>{`
                @media print {
                    /* Hide everything first */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Show only print area */
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                    }
                    
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .print-grid {
                        display: grid !important;
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 5mm !important;
                    }
                    
                    .print-card-item {
                        width: 95mm !important;
                        min-height: 55mm !important;
                        border: 1pt solid black !important;
                        border-radius: 2mm !important;
                        padding: 4mm !important;
                        background: white !important;
                        color: black !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    
                    .print-logos {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        margin-bottom: 3mm !important;
                        padding-bottom: 2mm !important;
                        border-bottom: 0.5pt solid #333 !important;
                    }
                    
                    .print-logo-img {
                        width: 12mm !important;
                        height: 12mm !important;
                        object-fit: contain !important;
                    }
                    
                    .print-title {
                        text-align: center !important;
                        font-size: 10pt !important;
                        font-weight: bold !important;
                        color: black !important;
                        margin: 2mm 0 3mm 0 !important;
                        text-transform: uppercase !important;
                    }
                    
                    .print-body {
                        font-size: 9pt !important;
                        line-height: 1.6 !important;
                        color: black !important;
                    }
                    
                    .print-creds {
                        margin-top: 2mm !important;
                        padding-top: 2mm !important;
                        border-top: 0.5pt dashed #666 !important;
                    }
                    
                    .print-row {
                        display: flex !important;
                        margin-bottom: 1mm !important;
                    }
                    
                    .print-lbl {
                        width: 14mm !important;
                        color: black !important;
                    }
                    
                    .print-val {
                        font-weight: bold !important;
                        color: black !important;
                    }
                    
                    .print-mono {
                        font-family: 'Courier New', monospace !important;
                    }
                }
            `}</style>

            <AdminLayout
                title="Cetak Kartu Login"
                subtitle="Print student login cards for exam"
                headerActions={headerActions}
            >
                {/* Controls - Hidden on print */}
                <div className="no-print space-y-6 mb-8">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Select value={classFilter} onValueChange={setClassFilter}>
                                        <SelectTrigger className="w-40 h-9">
                                            <Filter className="w-3 h-3 mr-2" />
                                            <SelectValue placeholder="Filter Kelas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Kelas</SelectItem>
                                            {uniqueClasses.map(kelas => (
                                                <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-slate-500">
                                        {filteredUsers.length} siswa
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAll}>
                                        <CheckSquare className="w-4 h-4 mr-2" />
                                        Pilih Semua
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={deselectAll}>
                                        <Square className="w-4 h-4 mr-2" />
                                        Batal Pilih
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-slate-800 mb-4">Pilih Siswa untuk Dicetak</h3>
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                                    {filteredUsers.map(user => (
                                        <button
                                            key={user.id_siswa}
                                            onClick={() => toggleSelect(user.id_siswa)}
                                            className={`p-3 rounded-lg border text-left transition-all ${selectedIds.has(user.id_siswa)
                                                ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {selectedIds.has(user.id_siswa) ? (
                                                    <CheckSquare className="w-5 h-5 text-violet-600 flex-shrink-0" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">{user.nama_lengkap}</p>
                                                    <p className="text-xs text-slate-500">{user.kelas}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Print Preview Label */}
                <div className="no-print mb-4">
                    <h3 className="font-semibold text-slate-800 mb-2">Preview Kartu Login</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        {selectedIds.size > 0
                            ? `${selectedIds.size} kartu terpilih untuk dicetak`
                            : `${filteredUsers.length} kartu akan dicetak (semua)`
                        }
                    </p>
                </div>

                {/* ========== PRINT AREA ========== */}
                <div id="print-area" className="print-grid grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                    {usersToPrint.map(user => (
                        <div key={user.id_siswa} className="print-card-item bg-white border border-slate-300 rounded-lg p-4">

                            {/* Logo Row */}
                            <div className="print-logos flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/logos/pemda.png"
                                    alt="Logo Pemda"
                                    className="print-logo-img w-12 h-12 object-contain"
                                />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/logos/sekolah.png"
                                    alt="Logo Sekolah"
                                    className="print-logo-img w-12 h-12 object-contain"
                                />
                            </div>

                            {/* Title */}
                            <h2 className="print-title text-center text-sm font-bold text-slate-800 uppercase mb-3">
                                {examName}
                            </h2>

                            {/* Student Info */}
                            <div className="print-body text-sm space-y-1">
                                <div className="print-row flex">
                                    <span className="print-lbl w-14 text-slate-600">Nama</span>
                                    <span className="w-4 text-center">:</span>
                                    <span className="print-val font-semibold text-slate-800">{user.nama_lengkap}</span>
                                </div>
                                <div className="print-row flex">
                                    <span className="print-lbl w-14 text-slate-600">Kelas</span>
                                    <span className="w-4 text-center">:</span>
                                    <span className="print-val font-semibold text-slate-800">{user.kelas}</span>
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="print-creds mt-2 pt-2 border-t border-dashed border-slate-400 text-sm space-y-1">
                                <div className="print-row flex">
                                    <span className="print-lbl w-14 text-slate-600">User</span>
                                    <span className="w-4 text-center">:</span>
                                    <span className="print-val print-mono font-mono font-bold text-slate-800">{user.username}</span>
                                </div>
                                <div className="print-row flex">
                                    <span className="print-lbl w-14 text-slate-600">Pass</span>
                                    <span className="w-4 text-center">:</span>
                                    <span className="print-val print-mono font-mono font-bold text-slate-800">{user.password}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {usersToPrint.length === 0 && !isLoading && (
                    <div className="no-print text-center py-12 text-slate-500">
                        <Printer className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Tidak ada data siswa untuk ditampilkan</p>
                    </div>
                )}
            </AdminLayout>
        </>
    );
}
