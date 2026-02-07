'use client';

/**
 * License Expired / Blocked Page
 * Displayed when school's license_status is FALSE
 */

import { XCircle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LicenseExpired() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-12 h-12 text-red-600" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-slate-800 mb-3">
                        Akses Dibatasi
                    </h1>

                    {/* Message */}
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        Akses ke sistem ujian untuk sekolah Anda saat ini tidak tersedia.
                        Silakan hubungi administrator untuk informasi lebih lanjut.
                    </p>

                    {/* Contact Info */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-slate-500" />
                            <div>
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="text-sm font-medium text-slate-700">admin@cbt.local</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-slate-500" />
                            <div>
                                <p className="text-xs text-slate-500">Telepon</p>
                                <p className="text-sm font-medium text-slate-700">+62 xxx-xxxx-xxxx</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <Link href="/">
                        <Button className="w-full" variant="outline">
                            Kembali ke Beranda
                        </Button>
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-slate-400 mt-6">
                    © 2026 CBT Serverless Platform
                </p>
            </div>
        </div>
    );
}
