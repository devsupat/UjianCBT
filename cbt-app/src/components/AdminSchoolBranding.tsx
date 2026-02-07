'use client';

import useSWR from 'swr';
import { School } from 'lucide-react';
import { getSchoolInfo } from '@/lib/queries';
import type { School as SchoolType } from '@/types';

/**
 * AdminSchoolBranding Component
 * 
 * Displays school logo and name dynamically based on logged-in admin's school_id
 * Shows fallback initials when logo is not available
 * 
 * Features:
 * - Fetches school data with RLS filtering
 * - SWR caching for performance
 * - Fallback to school name initials
 * - Premium styling with gradients
 */
export default function AdminSchoolBranding() {
    const { data: school, isLoading } = useSWR<SchoolType | null>(
        'school-branding',
        getSchoolInfo,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-slate-200 rounded"></div>
                    <div className="h-3 w-24 bg-slate-100 rounded"></div>
                </div>
            </div>
        );
    }

    if (!school) {
        return null;
    }

    // Generate initials from school name
    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(word => word[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const initials = getInitials(school.name);

    return (
        <div className="flex items-center gap-3">
            {/* Logo or Fallback Initials */}
            <div className="relative group">
                {school.logo_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white shadow-lg transition-transform group-hover:scale-105">
                        <img
                            src={school.logo_url}
                            alt={`${school.name} logo`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                    parent.innerHTML = `
                                        <div class="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                                            <span class="text-white font-bold text-lg">${initials}</span>
                                        </div>
                                    `;
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center ring-2 ring-white shadow-lg transition-transform group-hover:scale-105">
                        <span className="text-white font-bold text-lg tracking-tight">
                            {initials}
                        </span>
                    </div>
                )}

                {/* License Status Indicator */}
                {!school.license_status && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"
                        title="License Expired"
                    ></div>
                )}
            </div>

            {/* School Info */}
            <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 leading-tight">
                    {school.name}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <School className="w-3 h-3" />
                    <span>Dashboard Admin</span>
                </p>
            </div>
        </div>
    );
}
