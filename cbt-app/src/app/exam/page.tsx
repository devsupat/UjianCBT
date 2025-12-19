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
    LogOut,
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

    return (
        <div className="min-h-screen bg-slate-100">
            {/* ==================== BLUE HEADER ==================== */}
            <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg">
                <div className="w-full px-4 md:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between">
                        {/* Left: Logo & School Name */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-lg">📚</span>
                            </div>
                            <div className="hidden sm:block">
                                <p className="font-bold text-white text-sm">CBT Ujian Online Hebat</p>
                                <p className="text-blue-100 text-xs">{user.kelas || 'SD Negeri 1 Ciparay'}</p>
                            </div>
                        </div>

                        {/* Center: Timer */}
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-blue-100 mb-1">Sisa Waktu</span>
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg">
                                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                        </div>

                        {/* Right: User & Exit */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center text-amber-900 font-bold text-sm">
                                    {user.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-sm font-medium text-white">{user.nama_lengkap}</span>
                            </div>

                            {/* Mobile: Question Map Button */}
                            <button
                                onClick={() => setShowMobileDrawer(true)}
                                className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors"
                            >
                                <MapPin className="w-4 h-4" />
                                <span>Peta</span>
                            </button>

                            <button
                                onClick={() => setShowSubmitConfirm(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ==================== PROGRESS BAR ==================== */}
            <div className="bg-white border-b border-slate-200 px-6 md:px-10 lg:px-16 py-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium">Progress Pengerjaan</span>
                    <span className="text-sm text-slate-500">{answeredCount} / {questions.length} Soal</span>
                </div>
                <div className="mt-2">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ==================== MAIN CONTENT ==================== */}
            <div className="w-full px-6 md:px-10 lg:px-16 py-8 flex flex-col lg:flex-row gap-8">

                {/* ==================== LEFT: QUESTION AREA ==================== */}
                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        {currentQuestion && (
                            <motion.div
                                key={currentQuestion.id_soal}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Question Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Question Header */}
                                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                                        <h2 className="text-xl font-semibold text-slate-800">
                                            Soal Nomor {currentQuestionIndex + 1}
                                        </h2>
                                        <span className={`px-4 py-1.5 text-xs font-semibold rounded-full uppercase tracking-wide ${currentQuestion.tipe === 'COMPLEX'
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                                            }`}>
                                            {currentQuestion.tipe === 'COMPLEX' ? 'Pilihan Ganda Kompleks' : 'Pilihan Ganda'}
                                        </span>
                                    </div>

                                    {/* Question Content */}
                                    <div className="p-8">
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
                                        <p className="text-lg leading-relaxed text-slate-700 mb-8">
                                            {currentQuestion.pertanyaan}
                                        </p>

                                        {/* Answer Options - Radio Style */}
                                        <div className="space-y-5">
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
                                                        className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${isSelected
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        {/* Radio Circle */}
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected
                                                            ? 'border-blue-500 bg-blue-500'
                                                            : 'border-slate-300'
                                                            }`}>
                                                            {isSelected && (
                                                                <div className="w-2 h-2 bg-white rounded-full" />
                                                            )}
                                                        </div>
                                                        <span className={`text-base ${isSelected ? 'text-blue-800 font-medium' : 'text-slate-600'}`}>
                                                            {optionText}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {currentQuestion.tipe === 'COMPLEX' && (
                                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <p className="text-sm text-amber-700 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Pilih semua jawaban yang benar untuk soal ini
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Navigation Buttons - Updated Style */}
                                <div className="hidden md:flex items-center justify-between mt-10 gap-6">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="px-8 py-3 text-base border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                        <ChevronLeft className="w-5 h-5 mr-2" />
                                        Sebelumnya
                                    </Button>

                                    <Button
                                        size="lg"
                                        onClick={() => currentQuestion && toggleFlag(currentQuestion.id_soal)}
                                        className={`px-10 py-3 text-base ${flaggedQuestions.has(currentQuestion?.id_soal || '')
                                            ? 'bg-amber-400 hover:bg-amber-500 text-amber-900'
                                            : 'bg-amber-400 hover:bg-amber-500 text-amber-900'
                                            }`}
                                    >
                                        <Flag className="w-5 h-5 mr-2" />
                                        Ragu-ragu
                                    </Button>

                                    {currentQuestionIndex < questions.length - 1 ? (
                                        <Button
                                            size="lg"
                                            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                                            className="px-8 py-3 text-base bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Berikutnya
                                            <ChevronRight className="w-5 h-5 ml-2" />
                                        </Button>
                                    ) : (
                                        <Button
                                            size="lg"
                                            onClick={() => setShowSubmitConfirm(true)}
                                            className="px-8 py-3 text-base bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <Send className="w-5 h-5 mr-2" />
                                            Selesai
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* ==================== RIGHT: SIDEBAR - Desktop Only ==================== */}
                <aside className="hidden lg:block w-[320px] flex-shrink-0">
                    <div className="sticky top-32">
                        {/* Question Grid Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-base font-semibold text-slate-700 mb-5">Daftar Soal</h3>

                            {/* Question Number Grid - 5 columns */}
                            <div className="grid grid-cols-5 gap-3">
                                {questions.map((q, index) => {
                                    const isAnswered = answers[q.id_soal] !== undefined;
                                    const isCurrent = index === currentQuestionIndex;
                                    const isFlagged = flaggedQuestions.has(q.id_soal);

                                    return (
                                        <button
                                            key={q.id_soal}
                                            onClick={() => setCurrentQuestionIndex(index)}
                                            className={`
                                                w-11 h-11 rounded-lg font-semibold text-sm flex items-center justify-center 
                                                transition-all duration-200 cursor-pointer border-2
                                                ${isFlagged
                                                    ? 'bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-500'
                                                    : isAnswered
                                                        ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                                                        : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                                                }
                                                ${isCurrent ? 'ring-2 ring-offset-1 ring-blue-400' : ''}
                                            `}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-5 h-5 rounded bg-blue-500" />
                                    <span className="text-slate-600">Terjawab</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-5 h-5 rounded bg-amber-400" />
                                    <span className="text-slate-600">Ragu-ragu</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-5 h-5 rounded border-2 border-slate-300 bg-white" />
                                    <span className="text-slate-600">Belum Dijawab</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* ==================== MOBILE: STICKY BOTTOM NAVIGATION ==================== */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30 shadow-lg">
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
                        onClick={() => currentQuestion && toggleFlag(currentQuestion.id_soal)}
                        className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-900"
                    >
                        <Flag className="w-4 h-4 mr-1" />
                        Ragu-ragu
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
                                <h2 className="text-lg font-semibold text-slate-800">Daftar Soal</h2>
                                <button
                                    onClick={() => setShowMobileDrawer(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="p-5 pb-24">
                                {/* Question Grid */}
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((q, index) => {
                                        const isAnswered = answers[q.id_soal] !== undefined;
                                        const isCurrent = index === currentQuestionIndex;
                                        const isFlagged = flaggedQuestions.has(q.id_soal);

                                        return (
                                            <button
                                                key={q.id_soal}
                                                onClick={() => {
                                                    setCurrentQuestionIndex(index);
                                                    setShowMobileDrawer(false);
                                                }}
                                                className={`
                                                    w-10 h-10 rounded-lg font-semibold text-sm flex items-center justify-center 
                                                    transition-all duration-200 cursor-pointer border-2
                                                    ${isFlagged
                                                        ? 'bg-amber-400 text-amber-900 border-amber-500'
                                                        : isAnswered
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-white text-slate-500 border-slate-300'
                                                    }
                                                    ${isCurrent ? 'ring-2 ring-offset-1 ring-blue-400' : ''}
                                                `}
                                            >
                                                {index + 1}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-4 h-4 rounded bg-blue-500" />
                                        <span className="text-slate-600">Terjawab</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-4 h-4 rounded bg-amber-400" />
                                        <span className="text-slate-600">Ragu-ragu</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-4 h-4 rounded border-2 border-slate-300 bg-white" />
                                        <span className="text-slate-600">Belum Dijawab</span>
                                    </div>
                                </div>

                                {/* Submit Button */}
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
        </div>
    );
}
