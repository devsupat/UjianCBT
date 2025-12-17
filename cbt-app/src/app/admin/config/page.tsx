'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Settings,
    Save,
    Loader2,
    Eye,
    EyeOff,
    Clock,
    AlertTriangle,
    Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getConfig, updateConfig } from '@/lib/api';
import type { ExamConfig } from '@/types';

export default function ConfigPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const [formData, setFormData] = useState({
        exam_name: '',
        exam_duration: 90,
        admin_password: '',
        live_score_pin: '',
        max_violations: 3,
    });

    useEffect(() => {
        const auth = sessionStorage.getItem('admin_auth');
        if (auth !== 'true') {
            router.replace('/admin');
        }
    }, [router]);

    const { data, isLoading } = useSWR<{ success: boolean; data?: ExamConfig }>(
        'adminConfig',
        getConfig
    );

    useEffect(() => {
        if (data?.data) {
            setFormData({
                exam_name: data.data.exam_name || '',
                exam_duration: data.data.exam_duration || 90,
                admin_password: '',
                live_score_pin: '',
                max_violations: data.data.max_violations || 3,
            });
        }
    }, [data]);

    const handleSave = async (key: string, value: string | number) => {
        setIsSaving(true);
        setSaveMessage('');

        try {
            const response = await updateConfig(key, value);
            if (response.success) {
                setSaveMessage(`${key} berhasil disimpan`);
                setTimeout(() => setSaveMessage(''), 3000);
            } else {
                setSaveMessage(`Gagal menyimpan ${key}`);
            }
        } catch (error) {
            console.error('Save failed:', error);
            setSaveMessage('Terjadi kesalahan');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold gradient-text">Pengaturan Ujian</h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-6 max-w-2xl">
                {saveMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700"
                    >
                        {saveMessage}
                    </motion.div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Exam Name */}
                        <Card className="p-6 shadow-md">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Settings className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-slate-600 mb-2 block">Nama Ujian</label>
                                    <div className="flex gap-3">
                                        <Input
                                            value={formData.exam_name}
                                            onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                                            placeholder="Ujian Akhir Semester"
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => handleSave('exam_name', formData.exam_name)}
                                            disabled={isSaving}
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Exam Duration */}
                        <Card className="p-6 shadow-md">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-slate-600 mb-2 block">Durasi Ujian (menit)</label>
                                    <div className="flex gap-3">
                                        <Input
                                            type="number"
                                            value={formData.exam_duration}
                                            onChange={(e) => setFormData({ ...formData, exam_duration: parseInt(e.target.value) || 90 })}
                                            min={1}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => handleSave('exam_duration', formData.exam_duration)}
                                            disabled={isSaving}
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Max Violations */}
                        <Card className="p-6 shadow-md">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-slate-600 mb-2 block">Batas Pelanggaran</label>
                                    <p className="text-xs text-slate-500 mb-2">Jumlah pelanggaran sebelum diskualifikasi</p>
                                    <div className="flex gap-3">
                                        <Input
                                            type="number"
                                            value={formData.max_violations}
                                            onChange={(e) => setFormData({ ...formData, max_violations: parseInt(e.target.value) || 3 })}
                                            min={1}
                                            max={10}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => handleSave('max_violations', formData.max_violations)}
                                            disabled={isSaving}
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Admin Password */}
                        <Card className="p-6 shadow-md">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <Hash className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-slate-600 mb-2 block">Password Admin (Baru)</label>
                                    <p className="text-xs text-slate-500 mb-2">Kosongkan jika tidak ingin mengubah</p>
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.admin_password}
                                                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                                                placeholder="Password baru..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <Button
                                            onClick={() => handleSave('admin_password', formData.admin_password)}
                                            disabled={isSaving || !formData.admin_password}
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Live Score PIN */}
                        <Card className="p-6 shadow-md">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <Hash className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-slate-600 mb-2 block">PIN Live Score (Baru)</label>
                                    <p className="text-xs text-slate-500 mb-2">Kosongkan jika tidak ingin mengubah</p>
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <Input
                                                type={showPin ? 'text' : 'password'}
                                                value={formData.live_score_pin}
                                                onChange={(e) => setFormData({ ...formData, live_score_pin: e.target.value })}
                                                placeholder="PIN baru..."
                                                maxLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(!showPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <Button
                                            onClick={() => handleSave('live_score_pin', formData.live_score_pin)}
                                            disabled={isSaving || !formData.live_score_pin}
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
