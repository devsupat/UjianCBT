'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    Settings,
    Save,
    Loader2,
    Eye,
    EyeOff,
    Clock,
    AlertTriangle,
    Hash,
    Shield,
    FileText,
    CheckCircle2,
    AlertCircle,
    KeyRound,
    Shuffle,
    Trash2,
    Copy,
    Check
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getConfig, updateConfig, setExamPin } from '@/lib/api';
import type { ExamConfig } from '@/types';

export default function ConfigPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showExamPin, setShowExamPin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [copiedExamPin, setCopiedExamPin] = useState(false);
    const [examPinChanged, setExamPinChanged] = useState(false);

    const [formData, setFormData] = useState({
        exam_name: '',
        exam_duration: 90,
        admin_password: '',
        live_score_pin: '',
        exam_pin: '',
        max_violations: 3,
    });

    const { data, isLoading, mutate } = useSWR<{ success: boolean; data?: ExamConfig }>(
        'adminConfig',
        getConfig
    );

    useEffect(() => {
        if (data?.data) {
            setFormData(prev => ({
                ...prev,
                exam_name: data.data?.exam_name || '',
                exam_duration: data.data?.exam_duration || 90,
                max_violations: data.data?.max_violations || 3,
            }));
        }
    }, [data]);

    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            // Array of promises for sequential or parallel execution
            const updates = [];

            if (formData.exam_name !== data?.data?.exam_name) {
                updates.push(updateConfig('exam_name', formData.exam_name));
            }
            if (formData.exam_duration !== data?.data?.exam_duration) {
                updates.push(updateConfig('exam_duration', formData.exam_duration));
            }
            if (formData.max_violations !== data?.data?.max_violations) {
                updates.push(updateConfig('max_violations', formData.max_violations));
            }
            if (formData.admin_password) {
                updates.push(updateConfig('admin_password', formData.admin_password));
            }
            if (formData.live_score_pin) {
                updates.push(updateConfig('live_score_pin', formData.live_score_pin));
            }

            // Handle exam PIN - only save if changed
            if (examPinChanged) {
                updates.push(updateConfig('exam_pin', formData.exam_pin));
            }

            if (updates.length === 0) {
                setSaveMessage({ type: 'success', text: 'No changes to save' });
                setIsSaving(false);
                return;
            }

            await Promise.all(updates);

            // Clear sensitive fields after save
            setFormData(prev => ({ ...prev, admin_password: '', live_score_pin: '', exam_pin: '' }));
            setExamPinChanged(false);
            mutate(); // Refresh data

            setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
        } catch (error) {
            console.error('Save failed:', error);
            setSaveMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const headerActions = (
        <Button
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/30 border-0 h-11"
        >
            {isSaving ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                </>
            ) : (
                <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                </>
            )}
        </Button>
    );

    return (
        <AdminLayout
            title="Pengaturan"
            subtitle="Kelola pengaturan ujian dan protokol keamanan"
            headerActions={headerActions}
        >
            {/* Toast Message */}
            {saveMessage && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right fade-in duration-300 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-1 pointer-events-auto">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                            {saveMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="font-medium text-sm">{saveMessage.text}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {isLoading ? (
                    <div className="flex h-[50vh] items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-amber-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {/* General Settings Column */}
                        <div className="w-full min-w-0">
                            <Card className="border-0 shadow-xl ring-1 ring-slate-200/50 bg-white rounded-2xl overflow-hidden">
                                <CardHeader className="border-b border-slate-100 pb-6 bg-gradient-to-r from-amber-50/50 to-white">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-100 rounded-xl shadow-sm">
                                            <FileText className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-bold text-slate-800">Exam Parameters</CardTitle>
                                            <CardDescription className="text-sm mt-1">Configure basic exam properties</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-8 px-8 pb-8">
                                    <div className="space-y-3">
                                        <Label className="text-slate-700 font-semibold">Exam Name</Label>
                                        <Input
                                            value={formData.exam_name}
                                            onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                                            placeholder="e.g. Try Out Internal Persiapan TKA"
                                            className="h-12 bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">This name will be visible to all students</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-slate-700 font-semibold">Duration (Minutes)</Label>
                                            <Input
                                                type="number"
                                                value={formData.exam_duration}
                                                onChange={(e) => setFormData({ ...formData, exam_duration: parseInt(e.target.value) || 0 })}
                                                className="h-12 bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-slate-700 font-semibold">Max Violations</Label>
                                            <Input
                                                type="number"
                                                value={formData.max_violations}
                                                onChange={(e) => setFormData({ ...formData, max_violations: parseInt(e.target.value) || 0 })}
                                                className="h-12 bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Security Column */}
                        <div className="w-full min-w-0">
                            <Card className="border-0 shadow-xl ring-1 ring-slate-200/50 bg-white rounded-2xl overflow-hidden">
                                <CardHeader className="border-b border-slate-100 pb-6 bg-gradient-to-r from-rose-50/50 to-white">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-rose-100 rounded-xl shadow-sm">
                                            <Shield className="w-6 h-6 text-rose-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-bold text-slate-800">Security & Access</CardTitle>
                                            <CardDescription className="text-sm mt-1">Manage credentials and access codes</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-8 px-8 pb-8">
                                    {/* Admin Password */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-slate-700 font-bold text-sm">Admin Password</Label>
                                            <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">Sensitive</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">Leave blank if you don't want to change the password.</p>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.admin_password}
                                                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                                                placeholder="Enter new password"
                                                className="pr-12 h-12 bg-white border-2 border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors z-10"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live Score PIN */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-slate-700 font-bold text-sm">Live Score PIN</Label>
                                            <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Public Access</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">PIN required to access the public Live Score page.</p>
                                        <div className="relative">
                                            <Input
                                                type={showPin ? 'text' : 'password'}
                                                value={formData.live_score_pin}
                                                onChange={(e) => setFormData({ ...formData, live_score_pin: e.target.value })}
                                                placeholder="Enter new 6-digit PIN"
                                                maxLength={6}
                                                className="pr-12 h-12 bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(!showPin)}
                                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors z-10"
                                            >
                                                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Exam PIN - NEW! */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <KeyRound className="w-4 h-4 text-emerald-600" />
                                                <Label className="text-slate-700 font-bold text-sm">Exam PIN</Label>
                                            </div>
                                            <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Exam Start Control</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">Siswa harus input PIN ini setelah login untuk mulai ujian. Kosongkan untuk disable.</p>

                                        <div className="relative">
                                            <Input
                                                type={showExamPin ? 'text' : 'password'}
                                                value={formData.exam_pin}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, exam_pin: e.target.value.toUpperCase() });
                                                    setExamPinChanged(true);
                                                }}
                                                placeholder="Enter PIN (e.g., 2024 or ABC123)"
                                                maxLength={10}
                                                className="pr-12 h-12 bg-white border-2 border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono text-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowExamPin(!showExamPin)}
                                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors z-10"
                                            >
                                                {showExamPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
                                                    setFormData({ ...formData, exam_pin: randomPin });
                                                    setShowExamPin(true);
                                                    setExamPinChanged(true);
                                                }}
                                                className="flex-1 h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                            >
                                                <Shuffle className="w-3.5 h-3.5 mr-2" />
                                                Generate Random
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (formData.exam_pin) {
                                                        navigator.clipboard.writeText(formData.exam_pin);
                                                        setCopiedExamPin(true);
                                                        setTimeout(() => setCopiedExamPin(false), 2000);
                                                    }
                                                }}
                                                disabled={!formData.exam_pin}
                                                className="flex-1 h-9 border-slate-300 text-slate-600 hover:bg-slate-50"
                                            >
                                                {copiedExamPin ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 mr-2 text-green-600" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5 mr-2" />
                                                        Copy PIN
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, exam_pin: '' });
                                                    setExamPinChanged(true);
                                                }}
                                                className="h-9 border-red-300 text-red-600 hover:bg-red-50 px-3"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        {formData.exam_pin && (
                                            <div className="p-4 rounded-lg bg-emerald-600 text-white text-center">
                                                <p className="text-xs font-medium opacity-90 mb-2">Current PIN (Display to students)</p>
                                                <p className="text-4xl font-bold font-mono tracking-widest">{formData.exam_pin}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
