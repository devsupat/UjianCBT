import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
    if (seconds < 0) seconds = 0;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Generate unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
