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
    Shield,
    Menu,
    X,
    UserCircle,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
}

const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'from-blue-500 to-blue-600' },
    { href: '/admin/questions', icon: FileQuestion, label: 'Kelola Soal', color: 'from-emerald-500 to-emerald-600' },
    { href: '/admin/print-login', icon: Printer, label: 'Cetak Kartu', color: 'from-violet-500 to-violet-600' },
    { href: '/admin/config', icon: Settings, label: 'Pengaturan', color: 'from-amber-500 to-amber-600' },
    { href: '/live-score', icon: Activity, label: 'Live Score', color: 'from-rose-500 to-rose-600' },
];

export default function AdminLayout({ children, title, subtitle, headerActions }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        router.push('/admin');
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 font-sans">
            {/* Simple Flex Layout */}
            <div className="flex min-h-screen">
                {/* Mobile Overlay */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Sidebar - Fixed 240px on desktop, overlay on mobile */}
                <AnimatePresence mode="wait">
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ x: -240 }}
                            animate={{ x: 0 }}
                            exit={{ x: -240 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                mass: 0.8
                            }}
                            className="fixed lg:sticky lg:top-0 z-50 h-screen w-60 shrink-0 bg-white/80 backdrop-blur-2xl text-slate-800 flex flex-col border-r border-slate-200/60 shadow-xl"
                        >
                            {/* Logo Section - Apple Style */}
                            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200/60 bg-white/50">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                                        <Shield className="w-6 h-6 text-white drop-shadow-lg" />
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-white/0 to-white/20" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg tracking-tight text-slate-800">
                                            CBT Admin
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                            Control Panel
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Navigation Links - Apple Style */}
                            <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                                {navItems.map((item, index) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                    return (
                                        <motion.div
                                            key={item.href}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Link
                                                href={item.href}
                                                onClick={() => {
                                                    if (window.innerWidth < 1024) {
                                                        setSidebarOpen(false);
                                                    }
                                                }}
                                                className={`
                                                group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
                                                ${isActive
                                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                    }
                                            `}
                                            >
                                                {/* Active Indicator */}
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-full" />
                                                )}

                                                {/* Icon with gradient background */}
                                                <div className={`
                                                relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 flex-shrink-0
                                                ${isActive
                                                        ? `bg-gradient-to-br ${item.color} shadow-md`
                                                        : 'bg-slate-100 group-hover:bg-slate-200'
                                                    }
                                            `}>
                                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
                                                    {isActive && (
                                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-white/0 to-white/20" />
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <span className={`font-semibold text-[15px] tracking-wide ${isActive ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                    {item.label}
                                                </span>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>

                            {/* User Profile / Logout - Apple Style */}
                            <div className="p-4 border-t border-slate-200/60 bg-white/50">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 transition-all duration-200">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                                        <UserCircle className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="text-sm font-semibold text-slate-800 truncate">Administrator</p>
                                        <p className="text-xs text-slate-500 truncate">admin@school.id</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2.5 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-all duration-200 flex-shrink-0 group"
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content Area - Takes all remaining space */}
                <div className="flex-1 flex flex-col min-h-screen min-w-0">
                    {/* Header with large left padding */}
                    <header className="sticky top-0 z-30 h-16 lg:h-20 pl-10 pr-6 lg:pl-16 lg:pr-10 flex items-center justify-between bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
                        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
                            {/* Hamburger Menu Button */}
                            <button
                                onClick={toggleSidebar}
                                className="p-2 lg:p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:shadow-md active:scale-95 flex-shrink-0 group"
                                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                            >
                                <Menu className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform" />
                            </button>

                            {/* Title Section */}
                            <div className="min-w-0 border-l border-slate-200 pl-4 lg:pl-6">
                                <h1 className="text-lg lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 truncate">
                                    {title}
                                </h1>
                                {subtitle && <p className="text-xs lg:text-sm text-slate-500 font-medium mt-0.5 truncate">{subtitle}</p>}
                            </div>
                        </div>

                        {/* Header Actions */}
                        {headerActions && (
                            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 ml-2 lg:ml-4">
                                {headerActions}
                            </div>
                        )}
                    </header>

                    {/* Content Area - Large left padding for breathing room */}
                    <main className="flex-1 overflow-y-auto pl-10 pr-6 py-4 lg:pl-16 lg:pr-10 lg:py-6">
                        {children}
                    </main>
                </div>

                {/* Custom Scrollbar Styles */}
                <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.3);
                    border-radius: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.5);
                }
            `}</style>
            </div>
        </div>
    );
}

