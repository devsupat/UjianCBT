'use client';

import { AlertTriangle } from 'lucide-react';

interface TrueFalseMultiRendererProps {
    statements: string[];
    answers: (boolean | null)[];
    onAnswerChange: (answers: (boolean | null)[]) => void;
}

/**
 * Renders TRUE_FALSE_MULTI question type for student exam page.
 * Each statement has TRUE/FALSE radio buttons.
 */
export default function TrueFalseMultiRenderer({
    statements = [],
    answers = [],
    onAnswerChange
}: TrueFalseMultiRendererProps) {
    const safeStatements = statements || [];
    const safeAnswers = answers || [];

    const handleSelection = (index: number, value: boolean) => {
        const newAnswers: (boolean | null)[] = [...safeAnswers];
        // Ensure array is properly sized with null (not yet answered)
        while (newAnswers.length < safeStatements.length) {
            newAnswers.push(null);  // null = not answered yet
        }
        newAnswers[index] = value;
        onAnswerChange(newAnswers);
    };

    return (
        <div className="space-y-0">
            {/* Instruction */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-t-xl">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tentukan apakah setiap pernyataan berikut BENAR atau SALAH
                </p>
            </div>

            {/* Table Header - colorful and professional */}
            <div
                className="grid items-center font-semibold text-sm uppercase tracking-wider"
                style={{
                    gridTemplateColumns: '50px 1fr 100px 100px',
                    backgroundColor: '#1e40af',
                    color: 'white',
                    padding: '14px 20px',
                    borderLeft: '1px solid #1e40af',
                    borderRight: '1px solid #1e40af'
                }}
            >
                <div className="text-center">No</div>
                <div>Pernyataan</div>
                <div className="text-center">Benar</div>
                <div className="text-center">Salah</div>
            </div>

            {/* Statements list with zebra striping */}
            <div className="border border-slate-200 rounded-b-xl overflow-hidden">
                {safeStatements.map((statement, index) => {
                    const currentAnswer = safeAnswers[index];
                    const isTrue = currentAnswer === true;
                    const isFalse = currentAnswer === false;
                    // Only considered answered if explicitly true or false (not null/undefined)
                    const isAnswered = isTrue || isFalse;
                    // Zebra striping - even rows slightly darker
                    const isEvenRow = index % 2 === 0;

                    return (
                        <div
                            key={index}
                            className="grid items-center transition-all duration-200"
                            style={{
                                gridTemplateColumns: '50px 1fr 100px 100px',
                                padding: '16px 20px',
                                backgroundColor: isAnswered
                                    ? 'rgba(37, 99, 235, 0.08)'
                                    : isEvenRow
                                        ? '#f8fafc'
                                        : 'white',
                                borderBottom: index < safeStatements.length - 1 ? '1px solid #e2e8f0' : 'none'
                            }}
                        >
                            {/* Row Number */}
                            <div
                                className="flex items-center justify-center font-bold text-sm"
                                style={{
                                    color: '#1e40af',
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#dbeafe',
                                    borderRadius: '8px'
                                }}
                            >
                                {index + 1}
                            </div>

                            {/* Statement Text */}
                            <div
                                className="pr-4"
                                style={{
                                    color: '#1e293b',
                                    fontSize: '15px',
                                    lineHeight: '1.6'
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: String(statement || '')
                                        .replace(/&/g, '&amp;')
                                        .replace(/</g, '&lt;')
                                        .replace(/>/g, '&gt;')
                                        .replace(/\n/g, '<br>')
                                        .replace(/•/g, '&bull;')
                                }}
                            />

                            {/* BENAR Button */}
                            <div className="flex justify-center">
                                <label
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer"
                                    style={{
                                        backgroundColor: isTrue ? '#10b981' : 'white',
                                        color: isTrue ? 'white' : '#64748b',
                                        border: `2px solid ${isTrue ? '#10b981' : '#e2e8f0'}`,
                                        boxShadow: isTrue ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                                        minWidth: '80px'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`statement_${index}`}
                                        value="true"
                                        checked={isTrue}
                                        onChange={() => handleSelection(index, true)}
                                        className="sr-only"
                                    />
                                    <span
                                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                        style={{
                                            borderColor: isTrue ? 'white' : '#cbd5e1',
                                            backgroundColor: isTrue ? 'white' : 'transparent'
                                        }}
                                    >
                                        {isTrue && (
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: '#10b981' }}
                                            />
                                        )}
                                    </span>
                                    B
                                </label>
                            </div>

                            {/* SALAH Button */}
                            <div className="flex justify-center">
                                <label
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer"
                                    style={{
                                        backgroundColor: isFalse ? '#ef4444' : 'white',
                                        color: isFalse ? 'white' : '#64748b',
                                        border: `2px solid ${isFalse ? '#ef4444' : '#e2e8f0'}`,
                                        boxShadow: isFalse ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none',
                                        minWidth: '80px'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`statement_${index}`}
                                        value="false"
                                        checked={isFalse}
                                        onChange={() => handleSelection(index, false)}
                                        className="sr-only"
                                    />
                                    <span
                                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                        style={{
                                            borderColor: isFalse ? 'white' : '#cbd5e1',
                                            backgroundColor: isFalse ? 'white' : 'transparent'
                                        }}
                                    >
                                        {isFalse && (
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: '#ef4444' }}
                                            />
                                        )}
                                    </span>
                                    S
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
