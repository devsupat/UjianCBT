'use client';

import { useState, useEffect } from 'react';
import {
    Key,
    Copy,
    RefreshCw,
    Check,
    Power,
    Loader2,
    GraduationCap,
    BookOpen,
    School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface ActivePackets {
    paket_a: boolean;
    paket_b: boolean;
    paket_c: boolean;
}

interface ExamControlPanelProps {
    examToken: string | null;
    activePackets: ActivePackets | null;
    onUpdateToken: (token: string) => Promise<void>;
    onUpdatePackets: (packets: ActivePackets) => Promise<void>;
    isLoading?: boolean;
}

// Readable character set (no ambiguous chars like I/l/1, O/0)
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateToken(length: number = 6): string {
    let token = '';
    for (let i = 0; i < length; i++) {
        token += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
    }
    return token;
}

export default function ExamControlPanel({
    examToken,
    activePackets,
    onUpdateToken,
    onUpdatePackets,
    isLoading = false
}: ExamControlPanelProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [localPackets, setLocalPackets] = useState<ActivePackets>({
        paket_a: false,
        paket_b: false,
        paket_c: false
    });

    useEffect(() => {
        if (activePackets) {
            setLocalPackets(activePackets);
        }
    }, [activePackets]);

    const handleCopyToken = async () => {
        if (!examToken) return;
        await navigator.clipboard.writeText(examToken);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleGenerateToken = async () => {
        setIsGenerating(true);
        try {
            const newToken = generateToken();
            await onUpdateToken(newToken);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePacketChange = async (key: keyof ActivePackets, value: boolean) => {
        const newPackets = { ...localPackets, [key]: value };
        setLocalPackets(newPackets);
        setIsSaving(true);
        try {
            await onUpdatePackets(newPackets);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMasterToggle = async () => {
        const allActive = localPackets.paket_a && localPackets.paket_b && localPackets.paket_c;
        const newValue = !allActive;
        const newPackets: ActivePackets = {
            paket_a: newValue,
            paket_b: newValue,
            paket_c: newValue
        };
        setLocalPackets(newPackets);
        setIsSaving(true);
        try {
            await onUpdatePackets(newPackets);
        } finally {
            setIsSaving(false);
        }
    };

    const allActive = localPackets.paket_a && localPackets.paket_b && localPackets.paket_c;
    const anyActive = localPackets.paket_a || localPackets.paket_b || localPackets.paket_c;

    if (isLoading) {
        return (
            <Card className="mb-6 border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                <CardContent className="p-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="ml-3 text-indigo-600 font-medium">Memuat pengaturan ujian...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mb-6 border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 shadow-lg">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="text-gray-900">Kontrol Ujian</span>
                        <p className="text-sm font-normal text-gray-500 mt-0.5">
                            Token akses dan aktivasi paket
                        </p>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Token Section */}
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                Token Akses Ujian
                            </h4>
                            {isSaving && (
                                <span className="text-xs text-indigo-500 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...
                                </span>
                            )}
                        </div>

                        {/* Large Token Display */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1 bg-gray-900 text-white rounded-xl px-6 py-4 text-center">
                                <span className="text-4xl font-mono font-bold tracking-[0.3em]">
                                    {examToken || '------'}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopyToken}
                                disabled={!examToken}
                                className="h-14 w-14 shrink-0 border-gray-200 hover:bg-gray-100"
                            >
                                {isCopied ? (
                                    <Check className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Copy className="w-5 h-5 text-gray-500" />
                                )}
                            </Button>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerateToken}
                            disabled={isGenerating}
                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Generate Token Baru
                        </Button>

                        <p className="text-xs text-center text-gray-400 mt-3">
                            Siswa harus memasukkan token ini untuk memulai ujian
                        </p>
                    </div>

                    {/* Packet Activation Section */}
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                Aktivasi Paket Soal
                            </h4>
                        </div>

                        {/* Master Switch */}
                        <div
                            className={`flex items-center justify-between p-4 rounded-xl mb-4 transition-colors ${allActive
                                ? 'bg-emerald-50 border-2 border-emerald-200'
                                : 'bg-gray-50 border-2 border-gray-100'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${allActive ? 'bg-emerald-500' : 'bg-gray-300'
                                    }`}>
                                    <Power className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Aktifkan Semua</p>
                                    <p className="text-xs text-gray-500">Master switch</p>
                                </div>
                            </div>
                            <Switch
                                checked={allActive}
                                onCheckedChange={handleMasterToggle}
                                disabled={isSaving}
                                className="data-[state=checked]:bg-emerald-500 cursor-pointer"
                            />
                        </div>

                        {/* Individual Packet Switches */}
                        <div className="space-y-3">
                            {/* Paket A (SD) */}
                            <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${localPackets.paket_a ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-100'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${localPackets.paket_a ? 'bg-blue-500' : 'bg-gray-300'
                                        }`}>
                                        <BookOpen className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Paket A</p>
                                        <p className="text-xs text-gray-500">SD / Kelas 1-6</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={localPackets.paket_a}
                                    onCheckedChange={(v) => handlePacketChange('paket_a', v)}
                                    disabled={isSaving}
                                    className="data-[state=checked]:bg-blue-500 cursor-pointer"
                                />
                            </div>

                            {/* Paket B (SMP) */}
                            <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${localPackets.paket_b ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-100'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${localPackets.paket_b ? 'bg-purple-500' : 'bg-gray-300'
                                        }`}>
                                        <School className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Paket B</p>
                                        <p className="text-xs text-gray-500">SMP / Kelas 7-9</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={localPackets.paket_b}
                                    onCheckedChange={(v) => handlePacketChange('paket_b', v)}
                                    disabled={isSaving}
                                    className="data-[state=checked]:bg-purple-500 cursor-pointer"
                                />
                            </div>

                            {/* Paket C (SMA) */}
                            <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${localPackets.paket_c ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${localPackets.paket_c ? 'bg-amber-500' : 'bg-gray-300'
                                        }`}>
                                        <GraduationCap className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Paket C</p>
                                        <p className="text-xs text-gray-500">SMA / Kelas 10-12</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={localPackets.paket_c}
                                    onCheckedChange={(v) => handlePacketChange('paket_c', v)}
                                    disabled={isSaving}
                                    className="data-[state=checked]:bg-amber-500 cursor-pointer"
                                />
                            </div>
                        </div>

                        {!anyActive && (
                            <p className="text-xs text-center text-amber-600 mt-4 bg-amber-50 p-2 rounded-lg">
                                ⚠️ Tidak ada paket aktif. Siswa tidak bisa memulai ujian.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
