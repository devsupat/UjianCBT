'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    Loader2,
    GraduationCap,
    BookOpen,
    Target,
    CheckCircle2,
    AlertCircle,
    Info
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getSchoolConfig, updateSchoolConfig } from '@/lib/queries';

interface PacketToggleState {
    paket_a: boolean;
    paket_b: boolean;
    paket_c: boolean;
}

export default function ConfigPage() {
    const [savingPacket, setSavingPacket] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { data: config, isLoading, mutate } = useSWR<PacketToggleState>(
        'examConfig',
        getSchoolConfig,
        { refreshInterval: 5000 }
    );

    const handleTogglePacket = async (
        packetKey: 'paket_a' | 'paket_b' | 'paket_c',
        currentlyEnabled: boolean
    ) => {
        setSavingPacket(packetKey);
        setMessage(null);

        try {
            await updateSchoolConfig(packetKey, !currentlyEnabled);

            // Optimistic update
            await mutate();

            setMessage({
                type: 'success',
                text: `Paket ${packetKey.split('_')[1].toUpperCase()} ${!currentlyEnabled ? 'diaktifkan' : 'dinonaktifkan'}`
            });
        } catch (error) {
            console.error('Toggle failed:', error);
            setMessage({
                type: 'error',
                text: 'Gagal menyimpan pengaturan. Coba lagi.'
            });
        } finally {
            setSavingPacket(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const packets = [
        {
            key: 'paket_a' as const,
            label: 'Ujian Paket A (SD)',
            description: 'Soal ujian untuk tingkat Sekolah Dasar',
            icon: GraduationCap,
            color: {
                bg: 'from-blue-50 to-blue-100/50',
                border: 'border-blue-200',
                icon: 'text-blue-600',
                switchBg: 'data-[state=checked]:bg-blue-600'
            }
        },
        {
            key: 'paket_b' as const,
            label: 'Ujian Paket B (SMP)',
            description: 'Soal ujian untuk tingkat Sekolah Menengah Pertama',
            icon: BookOpen,
            color: {
                bg: 'from-emerald-50 to-emerald-100/50',
                border: 'border-emerald-200',
                icon: 'text-emerald-600',
                switchBg: 'data-[state=checked]:bg-emerald-600'
            }
        },
        {
            key: 'paket_c' as const,
            label: 'Ujian Paket C (SMA)',
            description: 'Soal ujian untuk tingkat Sekolah Menengah Atas',
            icon: Target,
            color: {
                bg: 'from-violet-50 to-violet-100/50',
                border: 'border-violet-200',
                icon: 'text-violet-600',
                switchBg: 'data-[state=checked]:bg-violet-600'
            }
        }
    ];

    return (
        <AdminLayout
            title="Konfigurasi Ujian"
            subtitle="Atur ketersediaan paket ujian per tingkat"
        >
            {/* Toast Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 right-8 z-50"
                    >
                        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-1">
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${message.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}>
                                {message.type === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5" />
                                )}
                                <span className="font-medium text-sm">{message.text}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-6">
                {/* Info Banner */}
                <Card className="border-0 shadow-lg ring-1 ring-blue-200 bg-gradient-to-r from-blue-50 to-white">
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Info className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 mb-1">
                                    Kontrol Ketersediaan Ujian
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Aktifkan atau nonaktifkan paket ujian sesuai jadwal PKBM Anda.
                                    Siswa hanya dapat mengakses ujian yang paketnya diaktifkan.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex h-[40vh] items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                    </div>
                )}

                {/* Packet Toggles */}
                {!isLoading && config && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {packets.map((packet, index) => {
                            const PacketIcon = packet.icon;
                            const isEnabled = config[packet.key];
                            const isSaving = savingPacket === packet.key;

                            return (
                                <motion.div
                                    key={packet.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className={`border-2 ${packet.color.border} shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden ${isEnabled ? 'ring-2 ring-offset-2 ring-slate-300' : ''
                                        }`}>
                                        <CardHeader className={`pb-4 bg-gradient-to-br ${packet.color.bg}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-3 bg-white rounded-xl shadow-sm ${packet.color.icon}`}>
                                                        <PacketIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg font-bold text-slate-800">
                                                            {packet.label.split('(')[0]}
                                                        </CardTitle>
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                            {packet.label.match(/\((.*?)\)/)?.[1]}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pt-6 pb-6 px-6 space-y-6">
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                {packet.description}
                                            </p>

                                            {/* Toggle Switch */}
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <Label
                                                        htmlFor={packet.key}
                                                        className="text-sm font-semibold text-slate-700 cursor-pointer"
                                                    >
                                                        {isEnabled ? '✅ Aktif' : '❌ Nonaktif'}
                                                    </Label>
                                                    {isSaving && (
                                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                    )}
                                                </div>
                                                <Switch
                                                    id={packet.key}
                                                    checked={isEnabled}
                                                    onCheckedChange={() => handleTogglePacket(packet.key, isEnabled)}
                                                    disabled={isSaving}
                                                    className={packet.color.switchBg}
                                                />
                                            </div>

                                            {/* Status Indicator */}
                                            <div className={`p-3 rounded-lg text-center text-sm font-medium ${isEnabled
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}>
                                                {isEnabled ? '🟢 Siswa dapat mengakses ujian' : '⚫ Ujian tidak tersedia'}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
