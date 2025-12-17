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
    XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    const currentQuestion: Question | undefined = questions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;

    const getTimerClass = () => {
        if (timeRemaining <= 60) return 'timer-danger';
        if (timeRemaining <= 300) return 'timer-warning';
        return 'timer-normal';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-xs text-slate-500">Peserta</p>
                            <p className="font-semibold text-slate-800">{user.nama_lengkap}</p>
                        </div>
                        <Badge variant="secondary">{user.kelas}</Badge>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 text-2xl font-mono font-bold ${getTimerClass()}`}>
                        <Clock className="w-6 h-6" />
                        {formatTime(timeRemaining)}
                    </div>

                    {/* Sync status */}
                    <div className="flex items-center gap-3">
                        {!isOnline ? (
                            <div className="flex items-center gap-2 text-amber-600 text-sm">
                                <WifiOff className="w-4 h-4" />
                                <span>Offline</span>
                            </div>
                        ) : isSyncing ? (
                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Menyimpan...</span>
                            </div>
                        ) : lastSyncTime ? (
                            <div className="flex items-center gap-2 text-emerald-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Tersimpan</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Wifi className="w-4 h-4" />
                            </div>
                        )}

                        {violations > 0 && (
                            <Badge variant="destructive">
                                Peringatan: {violations}/3
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span>Progress: {answeredCount}/{questions.length} soal dijawab</span>
                    </div>
                    <Progress value={answeredCount} max={questions.length} />
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 flex gap-6">
                {/* Main content */}
                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        {currentQuestion && (
                            <motion.div
                                key={currentQuestion.id_soal}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="p-6 shadow-lg">
                                    {/* Question header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge variant="secondary">
                                            Soal {currentQuestionIndex + 1} dari {questions.length}
                                        </Badge>
                                        <Badge variant={currentQuestion.tipe === 'COMPLEX' ? 'warning' : 'default'}>
                                            {currentQuestion.tipe === 'COMPLEX' ? 'Pilihan Ganda Kompleks' : 'Pilihan Ganda'}
                                        </Badge>
                                    </div>

                                    {/* Question image */}
                                    {currentQuestion.gambar_url && (
                                        <div className="mb-4 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                            <Image
                                                src={currentQuestion.gambar_url}
                                                alt="Gambar soal"
                                                width={800}
                                                height={400}
                                                className="w-full h-auto object-contain max-h-80"
                                            />
                                        </div>
                                    )}

                                    {/* Question text */}
                                    <div className="mb-6">
                                        <p className="text-lg leading-relaxed whitespace-pre-wrap text-slate-800">
                                            {currentQuestion.pertanyaan}
                                        </p>
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-3">
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
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 ${isSelected
                                                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                                                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                >
                                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {option}
                                                    </span>
                                                    <span className="pt-1">{optionText}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {currentQuestion.tipe === 'COMPLEX' && (
                                        <p className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                            ⚠️ Pilih semua jawaban yang benar
                                        </p>
                                    )}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                            disabled={currentQuestionIndex === 0}
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Sebelumnya
                        </Button>

                        {currentQuestionIndex < questions.length - 1 ? (
                            <Button
                                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                            >
                                Selanjutnya
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        ) : (
                            <Button
                                variant="success"
                                onClick={() => setShowSubmitConfirm(true)}
                            >
                                <Send className="w-5 h-5" />
                                Selesai Ujian
                            </Button>
                        )}
                    </div>
                </main>

                {/* Sidebar - Question navigation */}
                <aside className="hidden lg:block w-64">
                    <Card className="p-4 sticky top-40 shadow-lg">
                        <h3 className="text-sm font-semibold text-slate-500 mb-3">Navigasi Soal</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((q, index) => {
                                const isAnswered = answers[q.id_soal] !== undefined;
                                const isCurrent = index === currentQuestionIndex;

                                return (
                                    <button
                                        key={q.id_soal}
                                        onClick={() => setCurrentQuestionIndex(index)}
                                        className={`question-nav-item ${isAnswered ? 'answered' : 'unanswered'} ${isCurrent ? 'current' : ''}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-emerald-500" />
                                <span className="text-slate-600">Sudah dijawab</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-white border-2 border-slate-200" />
                                <span className="text-slate-600">Belum dijawab</span>
                            </div>
                        </div>

                        <Button
                            variant="success"
                            className="w-full mt-4"
                            onClick={() => setShowSubmitConfirm(true)}
                        >
                            <Send className="w-4 h-4" />
                            Selesai Ujian
                        </Button>
                    </Card>
                </aside>
            </div>

            {/* Warning Modal */}
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

            {/* Submit Confirmation Modal */}
            <AnimatePresence>
                {showSubmitConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
                        >
                            <h2 className="text-xl font-bold mb-2 text-slate-800">Konfirmasi Submit</h2>
                            <p className="text-slate-500 mb-4">
                                Anda yakin ingin menyelesaikan ujian?
                            </p>
                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-500">Soal dijawab:</span>
                                    <span className="font-semibold text-slate-800">{answeredCount}/{questions.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Waktu tersisa:</span>
                                    <span className="font-semibold text-slate-800">{formatTime(timeRemaining)}</span>
                                </div>
                            </div>
                            {answeredCount < questions.length && (
                                <p className="text-amber-600 text-sm mb-4 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                    ⚠️ Masih ada {questions.length - answeredCount} soal yang belum dijawab!
                                </p>
                            )}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowSubmitConfirm(false)}
                                    disabled={isSubmitting}
                                >
                                    <XCircle className="w-4 h-4" />
                                    Batal
                                </Button>
                                <Button
                                    variant="success"
                                    className="flex-1"
                                    onClick={() => handleSubmit(false)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
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
