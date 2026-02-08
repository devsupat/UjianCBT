'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    FileQuestion,
    Settings,
    Activity,
    LogOut,
    Menu,
    X,
    Printer,
    Users,
    ChevronRight
} from 'lucide-react';

/**
 * AdminLayout - CBT Admin 2.0
 * Designed for teachers aged 35-50
 * - Fixed sidebar with comfortable width (w-64)
 * - Clear, readable navigation labels
 * - Spacious main content area
 * - High contrast, intuitive design
 */

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
}

const navItems = [
    {
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        description: 'Pantau ujian'
    },
    {
        href: '/admin/students',
        icon: Users,
        label: 'Data Siswa',
        description: 'Kelola peserta'
    },
    {
        href: '/admin/questions',
        icon: FileQuestion,
        label: 'Bank Soal',
        description: 'Kelola soal ujian'
    },
    {
        href: '/admin/print-login',
        icon: Printer,
        label: 'Cetak Kartu',
        description: 'Kartu login siswa'
    },
    {
        href: '/admin/config',
        icon: Settings,
        label: 'Pengaturan',
        description: 'Konfigurasi ujian'
    },
    {
        href: '/live-score',
        icon: Activity,
        label: 'Live Score',
        description: 'Papan skor realtime'
    },
];

export default function AdminLayout({ children, title, subtitle, headerActions }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Handle responsive sidebar
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        router.push('/admin');
    };

    const closeMobileSidebar = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex min-h-screen">
                {/* Mobile Overlay */}
                {sidebarOpen && isMobile && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`
                        fixed lg:sticky lg:top-0 z-50 h-screen w-64 
                        bg-white border-r border-gray-200
                        flex flex-col
                        transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                        ${isMobile && !sidebarOpen ? 'invisible lg:visible' : 'visible'}
                    `}
                >
                    {/* Logo Section */}
                    <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-gray-900 text-base">CBT Admin</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeMobileSidebar}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-lg
                                        transition-all duration-200
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }
                                    `}
                                >
                                    {/* Icon */}
                                    <div className={`
                                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                                        ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}
                                    `}>
                                        <item.icon className="w-5 h-5" />
                                    </div>

                                    {/* Label */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-semibold ${isActive ? 'text-blue-700' : ''}`}>
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">
                                            {item.description}
                                        </div>
                                    </div>

                                    {/* Active Indicator */}
                                    {isActive && (
                                        <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="p-3 border-t border-gray-100">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-600">A</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">Admin</p>
                                <p className="text-xs text-gray-500 truncate">Administrator</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 hover:bg-white hover:text-red-600 text-gray-400 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-screen min-w-0">
                    {/* Header */}
                    <header className="sticky top-0 z-30 h-16 flex items-center bg-white border-b border-gray-200 px-4 lg:px-8">
                        <div className="flex items-center gap-4 flex-1">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            {/* Page Title */}
                            <div className="min-w-0">
                                <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="text-sm text-gray-500 truncate hidden sm:block">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Header Actions */}
                        {headerActions && (
                            <div className="flex items-center gap-3 shrink-0">
                                {headerActions}
                            </div>
                        )}
                    </header>

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto bg-gray-50">
                        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
