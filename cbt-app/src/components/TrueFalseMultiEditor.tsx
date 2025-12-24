'use client';

import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TrueFalseMultiEditorProps {
    statements: string[];
    answers: boolean[];
    onStatementsChange: (statements: string[]) => void;
    onAnswersChange: (answers: boolean[]) => void;
}

/**
 * Editor component for TRUE_FALSE_MULTI question type in admin panel.
 * Allows adding/removing statements and setting correct answers.
 */
export default function TrueFalseMultiEditor({
    statements = [],
    answers = [],
    onStatementsChange,
    onAnswersChange
}: TrueFalseMultiEditorProps) {
    // Defensive check to ensure we always have at least one statement to show
    const safeStatements = statements && statements.length > 0 ? statements : [''];
    const safeAnswers = answers && answers.length > 0 ? answers : [true];

    const handleAddStatement = () => {
        onStatementsChange([...safeStatements, '']);
        onAnswersChange([...safeAnswers, true]);
    };

    const handleRemoveStatement = (index: number) => {
        if (safeStatements.length <= 1) return;
        onStatementsChange(safeStatements.filter((_, i) => i !== index));
        onAnswersChange(safeAnswers.filter((_, i) => i !== index));
    };

    const handleStatementChange = (index: number, value: string) => {
        const newStatements = [...safeStatements];
        newStatements[index] = value;
        onStatementsChange(newStatements);
    };

    const handleAnswerChange = (index: number, value: boolean) => {
        const newAnswers = [...safeAnswers];
        newAnswers[index] = value;
        onAnswersChange(newAnswers);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Daftar Pernyataan</h3>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddStatement}
                    className="h-8 px-3 rounded-lg text-emerald-600 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold transition-all"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                </Button>
            </div>

            <div className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                {safeStatements.map((statement, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                    >
                        {/* Statement number */}
                        <div className="flex-shrink-0 flex items-center justify-center font-bold text-sm rounded-lg bg-slate-100 text-slate-500 w-8 h-8">
                            {index + 1}
                        </div>

                        {/* Statement input - now a compact single-line input */}
                        <Input
                            value={statement}
                            onChange={(e) => handleStatementChange(index, e.target.value)}
                            placeholder={`Pernyataan ${index + 1}...`}
                            className="flex-1 h-10 px-4 text-sm font-medium bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-lg transition-all"
                        />

                        {/* Answer toggle buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleAnswerChange(index, true)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${safeAnswers[index] === true
                                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
                                    }`}
                                title="BENAR"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAnswerChange(index, false)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${safeAnswers[index] === false
                                    ? 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500'
                                    }`}
                                title="SALAH"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Remove button */}
                        <button
                            type="button"
                            onClick={() => handleRemoveStatement(index)}
                            disabled={safeStatements.length <= 1}
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Hapus"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-200/50 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-lg flex items-center justify-center">
                            <Check className="w-3 h-3" />
                        </div>
                        <span>Benar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 text-white rounded-lg flex items-center justify-center">
                            <X className="w-3 h-3" />
                        </div>
                        <span>Salah</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
