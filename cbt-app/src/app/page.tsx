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
  Zap,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Award,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  // How it works steps
  const steps = [
    {
      step: '01',
      icon: LogIn,
      title: 'Login',
      description: 'Masuk dengan username dan password yang diberikan oleh admin atau pengawas ujian.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      step: '02',
      icon: ClipboardList,
      title: 'Kerjakan Ujian',
      description: 'Jawab soal dengan interface yang intuitif. Timer dan auto-save aktif.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      step: '03',
      icon: Award,
      title: 'Lihat Hasil',
      description: 'Skor langsung muncul di Live Score. Peringkat update real-time.',
      color: 'from-emerald-500 to-emerald-600',
    },
  ];

  // Bento grid features
  const bentoFeatures = [
    {
      icon: Lock,
      title: 'Anti Cheat',
      description: 'Proteksi keyboard shortcuts, deteksi tab switch, dan copy-paste.',
      gradient: 'from-red-500/10 to-orange-500/10',
      iconBg: 'bg-red-500',
    },
    {
      icon: Zap,
      title: 'Real-time Sync',
      description: 'Semua data tersinkronisasi secara instan.',
      gradient: 'from-amber-500/10 to-yellow-500/10',
      iconBg: 'bg-amber-500',
    },
    {
      icon: Trophy,
      title: 'Live Score',
      description: 'Papan peringkat dengan update real-time dan animasi dinamis.',
      gradient: 'from-purple-500/10 to-pink-500/10',
      iconBg: 'bg-purple-500',
    },
    {
      icon: BarChart3,
      title: 'Dashboard Admin',
      description: 'Monitoring lengkap dengan analitik dan pengelolaan soal.',
      gradient: 'from-emerald-500/10 to-teal-500/10',
      iconBg: 'bg-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">

      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-center shrink-0">
        <div className="flex items-center justify-center gap-2 text-sm text-white">
          <Info className="w-4 h-4 shrink-0" />
          <span><strong>Info:</strong> Ini adalah simulasi internal, bukan ujian resmi.</span>
        </div>
      </div>

      {/* Hero Section - Takes most of the viewport */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden bg-white px-6 py-16 lg:py-20">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Gradient Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/15 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-300/10 rounded-full blur-[180px]" />

        <div className="relative w-full max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-8 border border-blue-100 shadow-sm">
              <GraduationCap className="w-4 h-4" />
              Computer Based Test System
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
              CBT <span className="text-blue-600">Serverless</span>
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl text-slate-600 font-medium mb-4">
              dengan <span className="text-blue-600">Live Proctoring</span> Real-time
            </p>

            <p className="text-slate-500 text-lg md:text-xl max-w-23xl mx-auto mb-12 leading-relaxed">
              Platform ujian online modern. Aman, cepat, dan terintegrasi untuk pengalaman ujian yang profesional.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="xl" className="w-full sm:w-auto shadow-xl shadow-blue-500/30 text-base px-8" asChild>
                <Link href="/login">
                  <LogIn className="w-5 h-5" />
                  Mulai Ujian
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto border-2 border-amber-400 text-amber-600 hover:bg-amber-50 hover:border-amber-500 text-base px-8"
                asChild
              >
                <Link href="/live-score">
                  <Trophy className="w-5 h-5" />
                  Live Score
                </Link>
              </Button>

              <Button
                variant="secondary"
                size="xl"
                className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 text-base px-8"
                asChild
              >
                <Link href="/admin">
                  <Shield className="w-5 h-5" />
                  Admin Panel
                </Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                100% Secure
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Serverless Architecture
              </span>
              <span className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" />
                Anti-Cheat System
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 lg:py-32 px-8 sm:px-12 lg:px-24 bg-slate-50 shrink-0">
        <div className="w-full max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 lg:mb-20">
            <span className="inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-5">
              Cara Kerja
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5">
              Tiga Langkah Mudah
            </h2>
            <p className="text-slate-600 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto">
              Mulai ujian dalam hitungan menit dengan proses yang sederhana
            </p>
          </div>

          {/* Steps - Simple 3 column layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} text-white mb-6 shadow-xl`}>
                  <item.icon className="w-10 h-10" />
                </div>

                {/* Step Number + Title */}
                <div className="text-xs font-bold text-slate-400 tracking-widest mb-2">
                  LANGKAH {item.step}
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-slate-900 mb-3">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-base lg:text-lg leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 lg:py-32 px-6 sm:px-10 lg:px-20 bg-white shrink-0">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-5 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
              Fitur Unggulan
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Semua yang Anda Butuhkan
            </h2>
            <p className="text-slate-500 text-lg lg:text-xl max-w-2xl mx-auto">
              Fitur lengkap untuk pengalaman ujian online yang profesional
            </p>
          </motion.div>

          {/* Features Grid - Clean equal layout */}

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Ujian Online - Feature Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-1 rounded-2xl lg:rounded-3xl p-8 lg:p-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="relative h-full flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center mb-6">
                  <Monitor className="w-8 h-8" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold mb-3">Ujian Online</h3>
                <p className="text-blue-100 text-base lg:text-lg leading-relaxed">
                  Interface modern dengan navigasi intuitif. Timer, auto-save, dan pengalaman ujian yang nyaman di semua perangkat.
                </p>
              </div>
            </motion.div>

            {/* Other Feature Cards - 2x2 Grid */}
            <div className="flex-[2] grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              {bentoFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index + 1) * 0.1 }}
                  className={`rounded-2xl lg:rounded-3xl p-6 lg:p-8 bg-gradient-to-br ${feature.gradient} border border-slate-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
                >
                  <div className={`w-14 h-14 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-500 text-base lg:text-lg leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 bg-slate-100 border-t border-slate-200 shrink-0">
        <div className="w-full flex justify-center">
          <p className="text-slate-500 text-sm font-medium text-center">
            Created by Ahmad Saoghi, Guru SDN Sukasari 4
          </p>
        </div>
      </footer>
    </div>
  );
}