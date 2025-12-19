'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    XCircle,
    Flag,
    X,
    Shield,
    List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExamStore } from '@/store/examStore';
import { useExamSecurity } from '@/hooks/useExamSecurity';
import { getQuestions, syncAnswers, submitExam, reportViolation } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import type { Question, ViolationType } from '@/types';

export default function ExamPage() {
    const router = useRouter();
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const {
        user,
        questions,
        setQuestions,
        currentQuestionIndex,
        setCurrentQuestionIndex,
        answers,
        setAnswer,
        timeRemaining,
        decrementTime,
        violations,
        incrementViolations,
        setViolations,
        setLastSync,
        isSyncing,
        setIsSyncing,
        isSubmitted,
        setIsSubmitted,
        isExamStarted,
    } = useExamStore();

    const [isLoading, setIsLoading] = useState(true);
    const [showWarning, setShowWarning] = useState(false);
    const [warningCountdown, setWarningCountdown] = useState(0);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showWarningBar, setShowWarningBar] = useState(true);

    // Redirect if not logged in
    useEffect(() => {
        if (!user || !isExamStarted) {
            router.replace('/login');
        }
    }, [user, isExamStarted, router]);

    // Check PIN validation
    useEffect(() => {
        async function checkPinAccess() {
            if (!user) return;

            // Check if PIN is required
            const { getExamPinStatus } = await import('@/lib/api');
            const pinStatus = await getExamPinStatus();

            if (pinStatus.success && pinStatus.data?.isPinRequired) {
                // PIN required - check if validated
                const pinValidated = sessionStorage.getItem('pin_validated');
                if (!pinValidated) {
                    // Not validated, redirect to PIN page
                    router.replace('/pin-verify');
                    return;
                }
            }
        }

        if (user && isExamStarted) {
            checkPinAccess();
        }
    }, [user, isExamStarted, router]);

    // Load questions
    useEffect(() => {
        async function loadQuestions() {
            try {
                const response = await getQuestions();
                if (response.success && response.data) {
                    setQuestions(response.data);
                }
            } catch (error) {
                console.error('Failed to load questions:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (user) {
            loadQuestions();
        }
    }, [user, setQuestions]);

    // Timer countdown
    useEffect(() => {
        if (!user || isSubmitted) return;

        timerIntervalRef.current = setInterval(() => {
            decrementTime();
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [user, isSubmitted, decrementTime]);

    // Auto submit when time runs out
    useEffect(() => {
        if (timeRemaining <= 0 && !isSubmitted && user) {
            handleSubmit(true);
        }
    }, [timeRemaining, isSubmitted, user]);

    // Sync answers periodically
    useEffect(() => {
        if (!user || isSubmitted) return;

        syncIntervalRef.current = setInterval(async () => {
            if (Object.keys(answers).length > 0) {
                setIsSyncing(true);
                try {
                    await syncAnswers(user.id_siswa, answers);
                    setLastSync(new Date());
                    setLastSyncTime(new Date());
                } catch (error) {
                    console.error('Sync failed:', error);
                } finally {
                    setIsSyncing(false);
                }
            }
        }, 30000);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [user, answers, isSubmitted, setIsSyncing, setLastSync]);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-hide warning bar after 5 minutes
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWarningBar(false);
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearTimeout(timer);
    }, []);

    // Handle violation from security hook
    const handleViolation = useCallback(async (type: ViolationType, count: number) => {
        if (!user) return;

        incrementViolations();
        setViolations(count);

        try {
            await reportViolation(user.id_siswa, type);
        } catch (error) {
            console.error('Failed to report violation:', error);
        }

        // All violations get countdown: 1st=10s, 2nd=15s, 3rd=10s then kick
        const countdown = count === 1 ? 10 : count === 2 ? 15 : 10;
        setWarningCountdown(countdown);
        setShowWarning(true);

        const interval = setInterval(() => {
            setWarningCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setShowWarning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [user, incrementViolations, setViolations]);

    const handleSubmit = async (forced = false) => {
        if (!user || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const response = await submitExam(user.id_siswa, answers, forced);

            if (response.success) {
                setIsSubmitted(true);

                if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

                if (forced || response.status === 'DISKUALIFIKASI') {
                    router.replace('/exam/disqualified');
                } else {
                    router.replace(`/exam/thankyou?score=${response.score}`);
                }
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setIsSubmitting(false);
            setShowSubmitConfirm(false);
        }
    };

    const handleMaxViolations = useCallback(() => {
        handleSubmit(true);
    }, [handleSubmit]);

    useExamSecurity({
        maxViolations: 3,
        onViolation: handleViolation,
        onMaxViolations: handleMaxViolations,
        enabled: !isSubmitted && !!user,
    });

    const handleAnswerSelect = (questionId: string, value: string, isComplex: boolean) => {
        if (isComplex) {
            const currentAnswer = (answers[questionId] as string[]) || [];
            const newAnswer = currentAnswer.includes(value)
                ? currentAnswer.filter((v) => v !== value)
                : [...currentAnswer, value];
            setAnswer(questionId, newAnswer);
        } else {
            setAnswer(questionId, value);
        }
    };

    const toggleFlag = (questionId: string) => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });
    };

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Memuat soal ujian...</p>
                </div>
            </div>
        );
    }

    const currentQuestion: Question | undefined = questions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
            {/* ==================== WARNING BAR ==================== */}
            {showWarningBar && (
                <div
                    className="flex-shrink-0 text-white flex items-center justify-center gap-2 py-1.5 px-6"
                    style={{
                        backgroundColor: '#d97706', // Softer amber instead of harsh red
                        fontSize: '13px',
                        fontWeight: '500'
                    }}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>MODE UJIAN AKTIF - Jangan keluar dari halaman ini atau menutup browser</span>
                </div>
            )}

            {/* ==================== MAIN HEADER ==================== */}
            <header
                className="flex-shrink-0 text-white px-8 py-4"
                style={{ backgroundColor: '#1e3a8a', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            >
                <div className="flex justify-between items-center">
                    {/* Left: Logo & Title */}
                    <div className="flex items-center gap-4">
                        <Shield className="w-8 h-8" />
                        <div>
                            <h1 className="text-lg font-bold">Persiapan TKA Siswa SDN Sukasari 4 Tahun ajaran 2025/2026</h1>
                            <p className="text-sm opacity-90">Peserta: {user.nama_lengkap}</p>
                        </div>
                    </div>

                    {/* Right: Timer */}
                    <div className="text-right">
                        <div className="text-xs opacity-90 mb-1">Sisa Waktu</div>
                        <div
                            className="text-2xl font-bold font-mono"
                            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                        >
                            {formatTime(timeRemaining)}
                        </div>
                    </div>
                </div>
            </header>

            {/* ==================== MAIN CONTENT ==================== */}
            <div
                className="flex-1 overflow-y-auto"
                style={{ backgroundColor: '#f1f5f9' }}
            >
                {/* PAGE CONTAINER - max-width + padding */}
                <div
                    className="mx-auto"
                    style={{
                        maxWidth: '1400px',
                        padding: '32px 48px'
                    }}
                >
                    {/* GRID LAYOUT - content (2fr) + sidebar (1fr) */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr',
                            gap: '32px',
                            alignItems: 'start'
                        }}
                    >
                        {/* ==================== QUESTION AREA ==================== */}
                        <main style={{ paddingLeft: '24px', paddingRight: '16px' }}>
                            <AnimatePresence mode="wait">
                                {currentQuestion && (
                                    <motion.div
                                        key={currentQuestion.id_soal}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Question Header with Gradient - COMPACT */}
                                        <div
                                            className="text-white flex justify-between items-center"
                                            style={{
                                                background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
                                                borderRadius: '12px 12px 0 0',
                                                padding: '12px 20px'
                                            }}
                                        >
                                            <div>
                                                <div className="text-xs opacity-90 mb-1">Soal Nomor</div>
                                                <div className="text-2xl font-bold">{currentQuestionIndex + 1}</div>
                                            </div>
                                            <button
                                                onClick={() => toggleFlag(currentQuestion.id_soal)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                                style={{
                                                    background: flaggedQuestions.has(currentQuestion.id_soal)
                                                        ? '#f59e0b'
                                                        : 'transparent',
                                                    border: '1px solid rgba(255,255,255,0.7)',
                                                    color: 'white'
                                                }}
                                            >
                                                <Flag className="w-4 h-4" />
                                                Ragu-ragu
                                            </button>
                                        </div>

                                        {/* Question Content */}
                                        <div
                                            className="bg-white p-10 lg:p-12 mb-8"
                                            style={{
                                                borderRadius: '0 0 12px 12px',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {/* Question Image */}
                                            {currentQuestion.gambar_url && (
                                                <div className="mb-6 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                                                    <Image
                                                        src={currentQuestion.gambar_url}
                                                        alt="Gambar soal"
                                                        width={800}
                                                        height={400}
                                                        className="w-full h-auto object-contain max-h-64"
                                                    />
                                                </div>
                                            )}

                                            {/* Question Text */}
                                            <p
                                                className="mb-12"
                                                style={{
                                                    color: '#1e293b',
                                                    fontSize: '20px',
                                                    lineHeight: '1.9'
                                                }}
                                            >
                                                {currentQuestion.pertanyaan}
                                            </p>

                                            {/* Answer Options - EXPANDED SPACING */}
                                            <div className="flex flex-col gap-5">
                                                {['A', 'B', 'C', 'D', 'E'].map((option) => {
                                                    const optionKey = `opsi_${option.toLowerCase()}` as keyof Question;
                                                    const optionText = currentQuestion[optionKey] as string;

                                                    if (!optionText) return null;

                                                    const isSelected = currentQuestion.tipe === 'COMPLEX'
                                                        ? ((answers[currentQuestion.id_soal] as string[]) || []).includes(option)
                                                        : answers[currentQuestion.id_soal] === option;

                                                    return (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleAnswerSelect(currentQuestion.id_soal, option, currentQuestion.tipe === 'COMPLEX')}
                                                            className="w-full text-left flex items-center gap-5 p-6 rounded-xl transition-all duration-200 hover:translate-x-1"
                                                            style={{
                                                                border: `3px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                                                backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'white',
                                                                boxShadow: isSelected
                                                                    ? '0 4px 12px rgba(37, 99, 235, 0.2)'
                                                                    : '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}
                                                        >
                                                            {/* Circle Label */}
                                                            <div
                                                                className="flex-shrink-0 flex items-center justify-center font-bold text-xl"
                                                                style={{
                                                                    width: '48px',
                                                                    height: '48px',
                                                                    borderRadius: '50%',
                                                                    border: `3px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                                                                    backgroundColor: isSelected ? '#2563eb' : 'white',
                                                                    color: isSelected ? 'white' : '#1e293b',
                                                                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                                                                }}
                                                            >
                                                                {option}
                                                            </div>
                                                            <span
                                                                className="flex-1"
                                                                style={{
                                                                    color: '#1e293b',
                                                                    fontSize: '18px',
                                                                    lineHeight: '1.7'
                                                                }}
                                                            >
                                                                {optionText}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {currentQuestion.tipe === 'COMPLEX' && (
                                                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                    <p className="text-sm text-amber-700 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        Pilih semua jawaban yang benar untuk soal ini
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Navigation Buttons */}
                                        <div className="flex gap-6 justify-center mt-6">
                                            <button
                                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                                disabled={currentQuestionIndex === 0}
                                                className="flex items-center gap-3 px-12 py-4 rounded-xl font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                                style={{
                                                    backgroundColor: 'white',
                                                    color: '#1e293b',
                                                    border: '2px solid #cbd5e1',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    fontSize: '17px'
                                                }}
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                                Sebelumnya
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (currentQuestionIndex < questions.length - 1) {
                                                        setCurrentQuestionIndex(currentQuestionIndex + 1);
                                                    }
                                                }}
                                                disabled={currentQuestionIndex >= questions.length - 1}
                                                className="flex items-center gap-3 px-14 py-4 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                                style={{
                                                    backgroundColor: '#2563eb',
                                                    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                                                    fontSize: '17px'
                                                }}
                                            >
                                                Selanjutnya
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </main>

                        {/* ==================== SIDEBAR ==================== */}
                        <aside
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                height: 'fit-content',
                                overflow: 'visible'
                            }}
                        >
                            {/* Title */}
                            <h3
                                className="flex items-center gap-2 mb-5 font-bold"
                                style={{ color: '#1e293b', fontSize: '18px' }}
                            >
                                <List className="w-5 h-5" />
                                Daftar Soal
                            </h3>

                            {/* Legend */}
                            <div
                                style={{
                                    backgroundColor: '#f1f5f9',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    marginBottom: '20px'
                                }}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-5 h-5 rounded" style={{ backgroundColor: '#2563eb' }} />
                                    <span style={{ color: '#1e293b', fontSize: '13px' }}>Sedang dikerjakan</span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-5 h-5 rounded" style={{ backgroundColor: '#10b981' }} />
                                    <span style={{ color: '#1e293b', fontSize: '13px' }}>Sudah dijawab</span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-5 h-5 rounded" style={{ backgroundColor: '#f59e0b' }} />
                                    <span style={{ color: '#1e293b', fontSize: '13px' }}>Ragu-ragu</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded" style={{ backgroundColor: '#e5e7eb' }} />
                                    <span style={{ color: '#1e293b', fontSize: '13px' }}>Belum dijawab</span>
                                </div>
                            </div>

                            {/* Section Label for Question Numbers */}
                            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '500', marginBottom: '10px' }}>Nomor Soal</p>

                            {/* Question Grid - FLEX WRAP untuk semua nomor terlihat */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '10px',
                                    marginBottom: '24px'
                                }}
                            >
                                {questions.map((q, index) => {
                                    const isAnswered = answers[q.id_soal] !== undefined;
                                    const isCurrent = index === currentQuestionIndex;
                                    const isFlagged = flaggedQuestions.has(q.id_soal);

                                    // WARNA KONTRAS TINGGI
                                    let bgColor = '#cbd5e1'; // belum dijawab - ABU LEBIH GELAP
                                    let textColor = '#1e293b'; // HITAM untuk kontras
                                    let borderColor = '#94a3b8'; // border gelap

                                    if (isCurrent) {
                                        bgColor = '#2563eb'; // sedang dikerjakan
                                        textColor = '#ffffff';
                                        borderColor = '#2563eb';
                                    } else if (isFlagged) {
                                        bgColor = '#f59e0b'; // ragu-ragu
                                        textColor = '#ffffff';
                                        borderColor = '#f59e0b';
                                    } else if (isAnswered) {
                                        bgColor = '#10b981'; // sudah dijawab
                                        textColor = '#ffffff';
                                        borderColor = '#10b981';
                                    }

                                    return (
                                        <button
                                            key={q.id_soal}
                                            onClick={() => setCurrentQuestionIndex(index)}
                                            className="font-bold text-sm rounded-lg hover:opacity-80"
                                            style={{
                                                backgroundColor: bgColor,
                                                color: textColor,
                                                border: `2px solid ${borderColor}`,
                                                minWidth: '44px',
                                                height: '44px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                cursor: 'pointer',
                                                transition: 'opacity 0.15s ease'
                                            }}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={() => setShowSubmitConfirm(true)}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
                                    fontSize: '16px'
                                }}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Selesai & Kumpulkan
                            </button>

                            {/* Stats Footer */}
                            <div
                                className="mt-4 p-3 rounded-lg text-xs"
                                style={{ backgroundColor: '#f1f5f9', color: '#1e293b' }}
                            >
                                <div className="flex justify-between mb-1">
                                    <span>Dijawab:</span>
                                    <strong>{answeredCount} soal</strong>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span>Belum dijawab:</span>
                                    <strong>{unansweredCount} soal</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Ragu-ragu:</span>
                                    <strong>{flaggedQuestions.size} soal</strong>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {/* ==================== MOBILE: STICKY BOTTOM NAVIGATION ==================== */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30 shadow-lg">
                        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex-1 border-blue-500 text-blue-600"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Sebelumnya
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => setShowMobileDrawer(true)}
                                className="bg-slate-600 hover:bg-slate-700"
                            >
                                <List className="w-4 h-4" />
                            </Button>

                            {currentQuestionIndex < questions.length - 1 ? (
                                <Button
                                    size="sm"
                                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    Berikutnya
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => setShowSubmitConfirm(true)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Send className="w-4 h-4 mr-1" />
                                    Selesai
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* ==================== MOBILE: QUESTION MAP DRAWER ==================== */}
                    <AnimatePresence>
                        {showMobileDrawer && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowMobileDrawer(false)}
                                    className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                                />

                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 lg:hidden max-h-[80vh] overflow-y-auto"
                                >
                                    <div className="flex justify-center pt-3 pb-2">
                                        <div className="w-10 h-1 bg-slate-300 rounded-full" />
                                    </div>

                                    <div className="flex items-center justify-between px-5 pb-4 border-b border-slate-100">
                                        <h2 className="text-lg font-semibold text-slate-800">Daftar Soal</h2>
                                        <button
                                            onClick={() => setShowMobileDrawer(false)}
                                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-5 pb-24">
                                        <div className="grid grid-cols-5 gap-2 mb-6">
                                            {questions.map((q, index) => {
                                                const isAnswered = answers[q.id_soal] !== undefined;
                                                const isCurrent = index === currentQuestionIndex;
                                                const isFlagged = flaggedQuestions.has(q.id_soal);

                                                let bgColor = '#e5e7eb';
                                                if (isCurrent) bgColor = '#2563eb';
                                                else if (isFlagged) bgColor = '#f59e0b';
                                                else if (isAnswered) bgColor = '#10b981';

                                                return (
                                                    <button
                                                        key={q.id_soal}
                                                        onClick={() => {
                                                            setCurrentQuestionIndex(index);
                                                            setShowMobileDrawer(false);
                                                        }}
                                                        className="text-white font-bold text-sm rounded-md p-3"
                                                        style={{ backgroundColor: bgColor }}
                                                    >
                                                        {index + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <Button
                                            size="lg"
                                            onClick={() => {
                                                setShowMobileDrawer(false);
                                                setShowSubmitConfirm(true);
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-semibold"
                                        >
                                            <Send className="w-5 h-5 mr-2" />
                                            Selesai Ujian
                                        </Button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* ==================== WARNING MODAL ==================== */}
                    <AnimatePresence>
                        {showWarning && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white border-2 border-red-500 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
                                >
                                    <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                        <AlertTriangle className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-red-600 mb-2">
                                        PERINGATAN {violations}/3
                                    </h2>
                                    <p className="text-slate-600 mb-6">
                                        Anda terdeteksi melakukan kecurangan.
                                        {violations < 3
                                            ? ` Jika terulang ${3 - violations}x lagi, ujian akan dihentikan.`
                                            : ' Ujian Anda akan dihentikan.'}
                                    </p>
                                    {warningCountdown > 0 && (
                                        <p className="text-slate-500 text-sm">
                                            Modal akan tertutup dalam {warningCountdown} detik
                                        </p>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ==================== SUBMIT CONFIRMATION MODAL ==================== */}
                    <AnimatePresence>
                        {showSubmitConfirm && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                                >
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800 mb-1">Selesaikan Ujian?</h2>
                                        <p className="text-slate-500 text-sm">
                                            Pastikan semua jawaban sudah terisi dengan benar
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-slate-500">Soal dijawab</span>
                                            <span className="font-semibold text-emerald-600">{answeredCount}/{questions.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-slate-500">Soal ditandai ragu-ragu</span>
                                            <span className="font-semibold text-amber-600">{flaggedQuestions.size}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Waktu tersisa</span>
                                            <span className="font-semibold font-mono text-blue-600">
                                                {formatTime(timeRemaining)}
                                            </span>
                                        </div>
                                    </div>

                                    {answeredCount < questions.length && (
                                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                            <p className="text-amber-700 text-sm flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>Masih ada <strong>{questions.length - answeredCount} soal</strong> yang belum dijawab!</span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setShowSubmitConfirm(false)}
                                            disabled={isSubmitting}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Batal
                                        </Button>
                                        <Button
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleSubmit(false)}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                            )}
                                            Ya, Submit
                                        </Button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CSS Animations */}
                    <style jsx global>{`
                        @keyframes warningSlide {
                            0% { background-position: 0% 0%; }
                            100% { background-position: 200% 0%; }
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.6; }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
}
