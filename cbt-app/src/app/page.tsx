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
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  const features = [
    {
      icon: Monitor,
      title: 'Ujian Online',
      description: 'Interface modern dengan timer, auto-save, dan navigasi intuitif'
    },
    {
      icon: Lock,
      title: 'Anti Cheat',
      description: 'Deteksi tab switch, copy-paste, dan keyboard shortcuts'
    },
    {
      icon: Trophy,
      title: 'Live Score',
      description: 'Papan peringkat real-time dengan animasi dinamis'
    },
    {
      icon: BarChart3,
      title: 'Admin Dashboard',
      description: 'Monitoring peserta dan CRUD soal secara real-time'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Announcement Bar */}
      <div className="announcement-bar px-4 py-2 text-center text-sm">
        <div className="flex items-center justify-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Penting:</strong> Kegiatan ini merupakan latihan/simulasi internal sekolah dan bukan Tes Kemampuan Akademik (TKA) resmi dari Kemendikdasmen.
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-sky-100/30 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-sm mb-8">
              <GraduationCap className="w-4 h-4" />
              Computer Based Test System
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">CBT Serverless</span>
              <br />
              <span className="text-slate-500 text-3xl md:text-4xl">dengan Live Proctoring</span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Platform ujian online modern dengan keamanan anti-kecurangan,
              live score real-time, dan dashboard admin lengkap.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/login">
                <Button size="xl">
                  <LogIn className="w-5 h-5" />
                  Mulai Ujian
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/live-score">
                <Button variant="outline" size="xl">
                  <Trophy className="w-5 h-5" />
                  Live Score
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="secondary" size="xl">
                  <Shield className="w-5 h-5" />
                  Admin
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4 text-slate-800">Fitur Unggulan</h2>
            <p className="text-slate-600">Didesain untuk pengalaman ujian yang optimal</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full card-hover shadow-md">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-4 border border-blue-200">
                    <feature.icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 bg-white/50">
        <div className="container mx-auto text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} CBT System. Serverless Architecture.</p>
        </div>
      </footer>
    </div>
  );
}
