"use client"

import * as React from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    duration?: number
}

interface ToastContextType {
    toasts: ToastProps[]
    addToast: (toast: Omit<ToastProps, 'id'>) => void
    removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastProps[]>([])

    const addToast = React.useCallback((toast: Omit<ToastProps, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newToast = { ...toast, id }
        setToasts((prev) => [...prev, newToast])

        // Auto remove after duration
        const duration = toast.duration || 4000
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
    }, [])

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    )
}

function ToastContainer({
    toasts,
    removeToast
}: {
    toasts: ToastProps[]
    removeToast: (id: string) => void
}) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    )
}

function Toast({ toast, onClose }: { toast: ToastProps; onClose: () => void }) {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    }

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-200',
        error: 'bg-red-50 border-red-200',
        info: 'bg-blue-50 border-blue-200',
        warning: 'bg-amber-50 border-amber-200',
    }

    const textColors = {
        success: 'text-emerald-800',
        error: 'text-red-800',
        info: 'text-blue-800',
        warning: 'text-amber-800',
    }

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg min-w-[320px] max-w-md animate-in slide-in-from-right-5 fade-in-0 duration-300",
                bgColors[toast.type]
            )}
        >
            {icons[toast.type]}
            <span className={cn("flex-1 text-sm font-medium", textColors[toast.type])}>
                {toast.message}
            </span>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}

// Convenience functions
export function toast(message: string, type: ToastProps['type'] = 'info') {
    // This won't work outside React - use useToast hook instead
    console.warn('Use useToast hook for toast notifications')
}
