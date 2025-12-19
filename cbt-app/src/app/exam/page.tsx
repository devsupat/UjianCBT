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
    Wifi,
    WifiOff,
    Loader2,
    XCircle,
    Flag,
    Menu,
    X,
    MapPin
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

    // New state for flagged questions and mobile drawer
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!user || !isExamStarted) {
            router.replace('/login');
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

        const countdown = count === 1 ? 10 : count === 2 ? 15 : 0;
        setWarningCountdown(countdown);
        setShowWarning(true);

        if (countdown > 0) {
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
        }
    }, [user, incrementViolations, setViolations]);

    const handleMaxViolations = useCallback(() => {
        handleSubmit(true);
    }, []);

    useExamSecurity({
        maxViolations: 3,
        onViolation: handleViolation,
        onMaxViolations: handleMaxViolations,
        enabled: !isSubmitted && !!user,
    });

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

    const getTimerClass = () => {
        if (timeRemaining <= 60) return 'text-red-600';
        if (timeRemaining <= 300) return 'text-amber-600';
        return 'text-emerald-600';
    };

    const getTimerBgClass = () => {
        if (timeRemaining <= 60) return 'bg-red-50 border-red-200';
        if (timeRemaining <= 300) return 'bg-amber-50 border-amber-200';
        return 'bg-emerald-50 border-emerald-200';
    };

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
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

    // Navigation Grid Component (reused in sidebar and mobile drawer)
    const NavigationGrid = ({ onQuestionClick }: { onQuestionClick?: () => void }) => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-700">Daftar Soal</h3>
                <span className="text-sm text-slate-500">{answeredCount}/{questions.length} Terjawab</span>
            </div>

            <div className="grid grid-cols-5 gap-3">
                {questions.map((q, index) => {
                    const isAnswered = answers[q.id_soal] !== undefined;
                    const isCurrent = index === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id_soal);

                    return (
                        <button
                            key={q.id_soal}
                            onClick={() => {
                                setCurrentQuestionIndex(index);
                                onQuestionClick?.();
                            }}
                            className={`
                                w-11 h-11 rounded-lg font-semibold text-sm flex items-center justify-center 
                                transition-all duration-200 cursor-pointer border-2 relative
                                ${isFlagged
                                    ? 'bg-yellow-400 text-yellow-900 border-yellow-500 hover:bg-yellow-500'
                                    : isAnswered
                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                        : 'bg-white text-red-600 border-2 border-red-400 font-bold hover:bg-red-50 hover:border-red-500'
                                }
                                ${isCurrent ? 'ring-2 ring-offset-2 ring-yellow-400' : ''}
                            `}
                        >
                            {index + 1}
                            {isFlagged && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-600 rounded-full flex items-center justify-center">
                                    <Flag className="w-2 h-2 text-white" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="pt-6 mt-4 border-t border-slate-200 space-y-4 text-sm">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-blue-600" />
                    <span className="text-slate-600">Terjawab</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-yellow-400" />
                    <span className="text-slate-600">Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-white border-2 border-red-400" />
                    <span className="text-slate-600">Belum Dijawab</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100">
            {/* ==================== STICKY HEADER ==================== */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left: Exam Info */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Ujian CBT</p>
                                <p className="font-semibold text-slate-800 text-sm">{user.nama_lengkap}</p>
                            </div>
                            <div className="sm:hidden">
                                <p className="font-semibold text-slate-800 text-sm">{user.nama_lengkap}</p>
                            </div>
                            <span className="hidden sm:inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
                                {user.kelas}
                            </span>
                        </div>

                        {/* Center: Timer */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${getTimerBgClass()}`}>
                            <Clock className={`w-5 h-5 ${getTimerClass()}`} />
                            <span className={`text-xl font-mono font-bold ${getTimerClass()}`}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>

                        {/* Right: Status & Mobile Menu */}
                        <div className="flex items-center gap-3">
                            {/* Sync status - Desktop */}
                            <div className="hidden md:flex items-center gap-2">
                                {!isOnline ? (
                                    <div className="flex items-center gap-1.5 text-amber-600 text-xs bg-amber-50 px-2 py-1 rounded-md">
                                        <WifiOff className="w-3.5 h-3.5" />
                                        <span>Offline</span>
                                    </div>
                                ) : isSyncing ? (
                                    <div className="flex items-center gap-1.5 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded-md">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </div>
                                ) : lastSyncTime ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs bg-emerald-50 px-2 py-1 rounded-md">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Tersimpan</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                        <Wifi className="w-3.5 h-3.5" />
                                    </div>
                                )}

                                {violations > 0 && (
                                    <div className="flex items-center gap-1.5 text-red-600 text-xs bg-red-50 px-2 py-1 rounded-md border border-red-200">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Peringatan: {violations}/3</span>
                                    </div>
                                )}
                            </div>

                            {/* Mobile: Question Map Button */}
                            <button
                                onClick={() => setShowMobileDrawer(true)}
                                className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <MapPin className="w-4 h-4" />
                                <span>Peta</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ==================== MAIN CONTENT ==================== */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* ==================== LEFT: QUESTION AREA (80%) ==================== */}
                    <main className="lg:col-span-4">
                        <AnimatePresence mode="wait">
                            {currentQuestion && (
                                <motion.div
                                    key={currentQuestion.id_soal}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Question Card */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                        {/* Question Header */}
                                        <div className="px-8 lg:px-10 py-5 border-b border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center justify-between flex-wrap gap-3">
                                                <div className="flex items-center gap-4">
                                                    <span className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white font-bold rounded-xl text-xl">
                                                        {currentQuestionIndex + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 text-lg">Soal No. {currentQuestionIndex + 1}</p>
                                                        <p className="text-sm text-slate-500">
                                                            Sisa: {unansweredCount} soal belum dijawab
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${currentQuestion.tipe === 'COMPLEX'
                                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        }`}>
                                                        {currentQuestion.tipe === 'COMPLEX' ? 'Pilihan Ganda Kompleks' : 'Pilihan Ganda'}
                                                    </span>
                                                    {flaggedQuestions.has(currentQuestion.id_soal) && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200 flex items-center gap-1">
                                                            <Flag className="w-3 h-3" />
                                                            Ragu-ragu
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Question Content */}
                                        <div className="p-8 lg:p-10">
                                            {/* Question Image */}
                                            {currentQuestion.gambar_url && (
                                                <div className="mb-10 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    <Image
                                                        src={currentQuestion.gambar_url}
                                                        alt="Gambar soal"
                                                        width={800}
                                                        height={400}
                                                        className="w-full h-auto object-contain max-h-80"
                                                    />
                                                </div>
                                            )}

                                            {/* Question Text */}
                                            <div className="mb-12">
                                                <p className="text-xl leading-loose whitespace-pre-wrap text-slate-800">
                                                    {currentQuestion.pertanyaan}
                                                </p>
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-5">
                                                {['A', 'B', 'C', 'D', 'E'].map((option) => {
                                                    const optionKey = `opsi_${option.toLowerCase()}` as keyof Question;
                                                    const optionText = currentQuestion[optionKey] as string;

                                                    if (!optionText) return null;

                                                    const isSelected = currentQuestion.tipe === 'COMPLEX'
                                                        ? ((answers[currentQuestion.id_soal] as string[]) || []).includes(option)
                                                        : answers[currentQuestion.id_soal] === option;

                                                    return (
                                                        <motion.button
                                                            key={option}
                                                            whileHover={{ scale: 1.005 }}
                                                            whileTap={{ scale: 0.995 }}
                                                            onClick={() => handleAnswerSelect(currentQuestion.id_soal, option, currentQuestion.tipe === 'COMPLEX')}
                                                            className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-5 ${isSelected
                                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <span className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 transition-colors ${isSelected
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {option}
                                                            </span>
                                                            <span className={`text-lg leading-relaxed ${isSelected ? 'text-blue-800 font-medium' : 'text-slate-700'
                                                                }`}>
                                                                {optionText}
                                                            </span>
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>

                                            {currentQuestion.tipe === 'COMPLEX' && (
                                                <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                                                    <p className="text-sm text-amber-700 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        Pilih semua jawaban yang benar untuk soal ini
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ==================== NAVIGATION BUTTONS (Below Question) ==================== */}
                        <div className="hidden md:flex items-center justify-between mt-10 gap-6">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="px-6"
                            >
                                <ChevronLeft className="w-5 h-5 mr-2" />
                                Sebelumnya
                            </Button>

                            <Button
                                variant={flaggedQuestions.has(currentQuestion?.id_soal || '') ? 'default' : 'outline'}
                                size="lg"
                                onClick={() => currentQuestion && toggleFlag(currentQuestion.id_soal)}
                                className={`px-6 ${flaggedQuestions.has(currentQuestion?.id_soal || '')
                                    ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-400'
                                    : ''
                                    }`}
                            >
                                <Flag className="w-5 h-5 mr-2" />
                                {flaggedQuestions.has(currentQuestion?.id_soal || '') ? 'Hapus Tanda' : 'Ragu-ragu'}
                            </Button>

                            {currentQuestionIndex < questions.length - 1 ? (
                                <Button
                                    size="lg"
                                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                                    className="px-6 bg-blue-600 hover:bg-blue-700"
                                >
                                    Selanjutnya
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={() => setShowSubmitConfirm(true)}
                                    className="px-6 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Send className="w-5 h-5 mr-2" />
                                    Selesai Ujian
                                </Button>
                            )}
                        </div>
                    </main>

                    {/* ==================== RIGHT: SIDEBAR (25%) - Desktop Only ==================== */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-28 space-y-6">
                            {/* Navigation Grid Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <NavigationGrid />
                            </div>

                            {/* Submit Button */}
                            <Button
                                size="lg"
                                onClick={() => setShowSubmitConfirm(true)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-semibold shadow-sm"
                            >
                                <Send className="w-5 h-5 mr-2" />
                                Selesai Ujian
                            </Button>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ==================== MOBILE: STICKY BOTTOM NAVIGATION ==================== */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30 shadow-lg">
                <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="flex-1"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <Button
                        variant={flaggedQuestions.has(currentQuestion?.id_soal || '') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => currentQuestion && toggleFlag(currentQuestion.id_soal)}
                        className={`flex-1 ${flaggedQuestions.has(currentQuestion?.id_soal || '')
                            ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-400'
                            : ''
                            }`}
                    >
                        <Flag className="w-4 h-4" />
                    </Button>

                    {currentQuestionIndex < questions.length - 1 ? (
                        <Button
                            size="sm"
                            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => setShowSubmitConfirm(true)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ==================== MOBILE: QUESTION MAP DRAWER ==================== */}
            <AnimatePresence>
                {showMobileDrawer && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMobileDrawer(false)}
                            className="fixed inset-0 bg-black/50 z-50 md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 md:hidden max-h-[80vh] overflow-y-auto"
                        >
                            {/* Drawer Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-5 pb-4 border-b border-slate-100">
                                <h2 className="text-lg font-semibold text-slate-800">Peta Soal</h2>
                                <button
                                    onClick={() => setShowMobileDrawer(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="p-5 pb-24">
                                <NavigationGrid onQuestionClick={() => setShowMobileDrawer(false)} />

                                {/* Submit in Drawer */}
                                <Button
                                    size="lg"
                                    onClick={() => {
                                        setShowMobileDrawer(false);
                                        setShowSubmitConfirm(true);
                                    }}
                                    className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-semibold"
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
                        className="warning-overlay"
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
                                    <span className="font-semibold text-yellow-600">{flaggedQuestions.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Waktu tersisa</span>
                                    <span className={`font-semibold font-mono ${getTimerClass()}`}>
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
        </div>
    );
}
