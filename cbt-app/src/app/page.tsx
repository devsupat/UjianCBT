'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  LogIn,
  Trophy,
  Shield,
  ArrowRight,
  Monitor,
  Lock,
  BarChart3,
  Info,
  Users,
  FileCheck,
  TrendingUp,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const features = [
    {
      icon: Monitor,
      title: 'Ujian Online',
      description: 'Interface modern dengan timer, auto-save, dan navigasi intuitif untuk pengalaman ujian yang lancar.',
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'icon-gradient-blue',
    },
    {
      icon: Lock,
      title: 'Anti Cheat',
      description: 'Deteksi tab switch, copy-paste, dan proteksi keyboard shortcuts untuk keamanan maksimal.',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'icon-gradient-purple',
    },
    {
      icon: Trophy,
      title: 'Live Score',
      description: 'Papan peringkat real-time dengan animasi dinamis dan update instan.',
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'icon-gradient-amber',
    },
    {
      icon: BarChart3,
      title: 'Admin Dashboard',
      description: 'Monitoring peserta dan pengelolaan soal secara real-time dengan analitik lengkap.',
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'icon-gradient-emerald',
    },
  ];

  const stats = [
    { icon: Users, value: '1000+', label: 'Peserta Aktif', color: 'text-blue-600' },
    { icon: FileCheck, value: '50+', label: 'Ujian Diproses', color: 'text-emerald-600' },
    { icon: TrendingUp, value: '99.9%', label: 'Uptime System', color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden hero-gradient-bg">

      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-blue w-[500px] h-[500px] -top-48 -right-48 animate-float-slow" />
        <div className="orb orb-purple w-[400px] h-[400px] top-1/3 -left-32 animate-float" />
        <div className="orb orb-cyan w-[300px] h-[300px] bottom-1/4 right-1/4 animate-float-slow" style={{ animationDelay: '-2s' }} />
        <div className="orb orb-amber w-[200px] h-[200px] bottom-20 left-1/3 animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Announcement Bar */}
      <div className="relative z-10 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/50 px-4 py-3">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 text-amber-800 font-medium">
            <Info className="w-4 h-4" />
            <span>Info: Ini adalah simulasi internal, bukan ujian resmi.</span>
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex items-center justify-center py-16 md:py-24 px-4">
        <div className="container mx-auto text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-premium text-blue-700 text-sm font-semibold mb-8 shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Computer Based Test System</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </motion.div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 tracking-tight leading-[1.1]">
              <span className="text-gradient-hero">CBT Serverless</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl md:text-2xl lg:text-3xl font-medium text-slate-600 mb-4"
            >
              dengan <span className="text-blue-600 font-semibold">Live Proctoring</span> Real-time
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Platform ujian online modern yang aman, cepat, dan terintegrasi.
              Didesain untuk pengalaman ujian yang mulus dan profesional.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="xl" className="w-full sm:w-auto btn-premium group" asChild>
                <Link href="/login">
                  <LogIn className="w-5 h-5" />
                  <span>Mulai Ujian</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button variant="outline" size="xl" className="w-full sm:w-auto bg-white/70 backdrop-blur-sm hover:bg-white group" asChild>
                <Link href="/live-score">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Live Score</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button variant="secondary" size="xl" className="w-full sm:w-auto bg-slate-100/80 backdrop-blur-sm hover:bg-slate-200 group" asChild>
                <Link href="/admin">
                  <Shield className="w-5 h-5 text-slate-600" />
                  <span>Admin Panel</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                100% Secure
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Real-time Sync
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                Serverless
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-premium rounded-3xl p-8 md:p-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="text-center"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color === 'text-blue-600' ? 'from-blue-100 to-blue-50' : stat.color === 'text-emerald-600' ? 'from-emerald-100 to-emerald-50' : 'from-purple-100 to-purple-50'} mb-4`}>
                    <stat.icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                  <div className={`text-4xl md:text-5xl font-black stat-number ${stat.color} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-slate-500 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4">
              Fitur Unggulan
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
              Semua yang Anda Butuhkan
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Fitur lengkap untuk pengalaman ujian online yang profesional dan aman
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="group"
              >
                <div className="glass-card rounded-3xl p-6 h-full relative overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  {/* Icon */}
                  <div className={`relative w-14 h-14 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-4 flex items-center text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Pelajari lebih lanjut</span>
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-10 md:p-14 text-center shadow-2xl shadow-blue-500/25"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <GraduationCap className="w-16 h-16 text-white/80 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Siap Memulai Ujian?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Bergabung sekarang dan rasakan pengalaman ujian online yang berbeda.
                Cepat, aman, dan profesional.
              </p>
              <Button size="xl" className="bg-white text-blue-700 hover:bg-blue-50 btn-premium" asChild>
                <Link href="/login">
                  <LogIn className="w-5 h-5" />
                  <span>Mulai Sekarang</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 px-4 border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800">CBT System</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm">
              <Link href="/login" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
                Mulai Ujian
              </Link>
              <Link href="/live-score" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
                Live Score
              </Link>
              <Link href="/admin" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
                Admin
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} CBT System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}