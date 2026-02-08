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
    Printer,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
}

const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/20' },
    { href: '/admin/questions', icon: FileQuestion, label: 'Kelola Soal', color: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20' },
    { href: '/admin/print-login', icon: Printer, label: 'Cetak Kartu', color: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20' },
    { href: '/admin/config', icon: Settings, label: 'Pengaturan', color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20' },
    { href: '/live-score', icon: Activity, label: 'Live Score', color: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/20' },
];

export default function AdminLayout({ children, title, subtitle, headerActions }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Track scroll for header shadow
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            setScrolled(target.scrollTop > 10);
        };

        const main = document.querySelector('main');
        main?.addEventListener('scroll', handleScroll);
        return () => main?.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        router.push('/admin');
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="min-h-screen bg-gradient-app font-sans relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-violet-200 to-purple-200 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
            </div>

            <div className="flex min-h-screen relative">
                {/* Mobile Overlay with enhanced blur */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Premium Glassmorphic Sidebar */}
                <AnimatePresence mode="wait">
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{
                                type: "spring",
                                stiffness: 280,
                                damping: 28,
                                mass: 0.7
                            }}
                            className="fixed lg:sticky lg:top-0 z-50 h-screen w-72 shrink-0 bg-white/70 backdrop-blur-2xl text-slate-800 flex flex-col border-r border-white/20 shadow-premium"
                        >
                            {/* Premium Logo Section */}
                            <div className="h-24 flex items-center justify-between px-7 border-b border-white/30 bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-xl">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 shadow-xl shadow-blue-500/40"
                                        whileHover={{ scale: 1.05, rotate: 5 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        <Shield className="w-7 h-7 text-white drop-shadow-2xl" />
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/20 to-white/40" />
                                        <motion.div
                                            className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0"
                                            whileHover={{ opacity: 0.7 }}
                                            style={{ filter: 'blur(8px)', zIndex: -1 }}
                                        />
                                    </motion.div>
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                            CBT Premium
                                        </span>
                                        <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                            Admin Suite
                                        </span>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={() => setSidebarOpen(false)}
                                    className="lg:hidden p-2.5 hover:bg-white/60 rounded-xl transition-all text-slate-500 hover:text-slate-800 backdrop-blur-sm"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>
                            </div>

                            {/* Premium Navigation */}
                            <nav className="flex-1 py-8 px-5 space-y-2 overflow-y-auto custom-scrollbar">
                                {navItems.map((item, index) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                    return (
                                        <motion.div
                                            key={item.href}
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
                                        >
                                            <Link
                                                href={item.href}
                                                onClick={() => {
                                                    if (window.innerWidth < 1024) {
                                                        setSidebarOpen(false);
                                                    }
                                                }}
                                                className="block group"
                                            >
                                                <motion.div
                                                    className={`
                                                        relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300
                                                        ${isActive
                                                            ? 'bg-gradient-to-r from-white/80 to-white/60 text-slate-900 shadow-lg shadow-slate-900/5 border border-white/50'
                                                            : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 hover:shadow-md'
                                                        }
                                                    `}
                                                    whileHover={{ x: isActive ? 0 : 4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {/* Enhanced Active Indicator */}
                                                    {isActive && (
                                                        <motion.div
                                                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b ${item.color} rounded-r-full`}
                                                            layoutId="activeIndicator"
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}

                                                    {/* Premium Icon Background */}
                                                    <div className={`
                                                        relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300
                                                        ${isActive
                                                            ? `bg-gradient-to-br ${item.color} shadow-lg ${item.glow}`
                                                            : 'bg-slate-100/80 group-hover:bg-slate-200/80'
                                                        }
                                                    `}>
                                                        <item.icon className={`w-5 h-5 transition-all ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-slate-700 group-hover:scale-110'}`} />
                                                        {isActive && (
                                                            <>
                                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-white/30" />
                                                                <motion.div
                                                                    className="absolute inset-0 rounded-xl bg-white"
                                                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                    style={{ mixBlendMode: 'soft-light' }}
                                                                />
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Premium Label */}
                                                    <span className={`font-bold text-[15px] tracking-wide transition-all ${isActive
                                                        ? 'text-slate-900'
                                                        : 'text-slate-600 group-hover:text-slate-900'
                                                        }`}>
                                                        {item.label}
                                                    </span>

                                                    {/* Active Glow Effect */}
                                                    {isActive && (
                                                        <motion.div
                                                            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-violet-500/10"
                                                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                                                            transition={{ duration: 3, repeat: Infinity }}
                                                        />
                                                    )}
                                                </motion.div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>

                            {/* Premium User Profile Section */}
                            <div className="p-5 border-t border-white/30 bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-xl">
                                <motion.div
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-slate-50/80 to-white/80 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm group cursor-pointer"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-100 flex items-center justify-center shrink-0 border-2 border-white shadow-lg group-hover:shadow-xl transition-shadow">
                                        <UserCircle className="w-7 h-7 text-slate-600" />
                                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-md" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">Administrator</p>
                                        <p className="text-xs text-slate-500 truncate font-medium">admin@school.id</p>
                                    </div>
                                    <motion.button
                                        onClick={handleLogout}
                                        className="p-3 hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 hover:text-red-600 text-slate-400 rounded-xl transition-all duration-300 flex-shrink-0 border border-transparent hover:border-red-200 hover:shadow-md"
                                        title="Logout"
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </motion.button>
                                </motion.div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                    {/* Premium Header with Dynamic Shadow */}
                    <motion.header
                        className={`sticky top-0 z-30 h-20 lg:h-24 flex items-center justify-between bg-white/80 backdrop-blur-2xl border-b border-white/40 transition-all duration-300 ${scrolled ? 'shadow-xl shadow-slate-900/5' : 'shadow-sm'
                            }`}
                        initial={false}
                        animate={{
                            boxShadow: scrolled
                                ? '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)'
                                : '0 1px 3px 0 rgb(0 0 0 / 0.05)'
                        }}
                    >
                        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-12 flex items-center justify-between">
                            <div className="flex items-center gap-4 lg:gap-8 min-w-0">
                            {/* Premium Hamburger Menu */}
                            <motion.button
                                onClick={toggleSidebar}
                                className="p-3 lg:p-3.5 text-slate-600 hover:bg-gradient-to-br hover:from-slate-100 hover:to-slate-50 hover:text-slate-900 rounded-2xl transition-all duration-300 flex-shrink-0 border border-transparent hover:border-slate-200 hover:shadow-lg group"
                                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Menu className="w-6 h-6 lg:w-7 lg:h-7 group-hover:rotate-180 transition-transform duration-500" />
                            </motion.button>

                            {/* Premium Title Section */}
                            <div className="min-w-0 border-l-2 border-slate-200 pl-6 lg:pl-8">
                                <motion.h1
                                    className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent truncate tracking-tight"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={title}
                                >
                                    {title}
                                </motion.h1>
                                {subtitle && (
                                    <motion.p
                                        className="text-xs sm:text-sm lg:text-base text-slate-500 font-semibold mt-1 truncate"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        {subtitle}
                                    </motion.p>
                                )}
                            </div>
                            </div>

                            {/* Header Actions */}
                            {headerActions && (
                                <motion.div
                                    className="flex items-center gap-3 lg:gap-4 flex-shrink-0 ml-4 pr-2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {headerActions}
                                </motion.div>
                            )}
                        </div>
                    </motion.header>

                    {/* Premium Content Area */}
                    <main className="flex-1 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                            className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 lg:py-10"
                        >
                            {children}
                        </motion.div>
                    </main>
                </div>

                {/* Enhanced Custom Scrollbar Styles */}
                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: linear-gradient(to bottom, rgba(148, 163, 184, 0.4), rgba(100, 116, 139, 0.4));
                        border-radius: 10px;
                        border: 2px solid transparent;
                        background-clip: padding-box;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: linear-gradient(to bottom, rgba(148, 163, 184, 0.6), rgba(100, 116, 139, 0.6));
                        background-clip: padding-box;
                    }
                    
                    /* Smooth scrolling */
                    main {
                        scroll-behavior: smooth;
                    }
                    
                    /* Premium animations */
                    @keyframes shimmer {
                        0% { background-position: -1000px 0; }
                        100% { background-position: 1000px 0; }
                    }
                `}</style>
            </div>
        </div>
    );
}
