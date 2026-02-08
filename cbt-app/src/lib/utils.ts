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

/**
 * Detect exam packet (A/B/C) from class name
 * - Paket A = SD (grades 1-6)
 * - Paket B = SMP (grades VII-IX or 7-9)
 * - Paket C = SMA (grades X-XII or 10-12)
 * 
 * @param className - e.g., "VII/A", "VIII-B", "Kelas 9", "X IPA 1", etc.
 * @returns 'A' | 'B' | 'C'
 */
export function detectPacket(className: string): 'A' | 'B' | 'C' {
    if (!className) return 'B'; // Default to SMP if no class

    const cls = className.toUpperCase().trim();

    // SMA: X, XI, XII, 10, 11, 12 (check first to avoid X matching in other contexts)
    // Use word boundaries to match exact grade numbers
    if (/\bXII\b/.test(cls) || /\bXI\b/.test(cls) || /\bX\b/.test(cls)) return 'C';
    if (/\b12\b/.test(cls) || /\b11\b/.test(cls) || /\b10\b/.test(cls)) return 'C';

    // SMP: VII, VIII, IX, 7, 8, 9
    if (/\bIX\b/.test(cls) || /\bVIII\b/.test(cls) || /\bVII\b/.test(cls)) return 'B';
    if (/\b9\b/.test(cls) || /\b8\b/.test(cls) || /\b7\b/.test(cls)) return 'B';

    // SD: 1-6 (after excluding 10-12)
    if (/\b[1-6]\b/.test(cls) || /SD/i.test(cls)) return 'A';

    // Default to SMP (most common school type in Indonesia)
    return 'B';
}

