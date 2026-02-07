Migration to Supabase Multi-Tenant CBT
📌 Phase 1: Database Schema & Multi-Tenancy (The Foundation)
Goal: Membangun struktur database PostgreSQL yang mendukung banyak sekolah sekaligus.

[x] Task 1.1: Core Tables Creation

Buat tabel schools untuk menyimpan data instansi (SMP Minahasa, PKBM, dll).

Kolom wajib: id (UUID), name, license_status (boolean), logo_url, created_at.

[x] Task 1.2: User Profiles & Auth Integration

Buat tabel profiles yang terhubung dengan auth.users Supabase.

Kolom wajib: id (references auth.users), school_id (references schools), full_name, role (admin/student), class_group, photo_url.

[x] Task 1.3: Questions & Exams Schema

Migrasi struktur dari Questions sheet.

Tambahkan kolom school_id dan packet_type (Paket A/B/C).

Gunakan tipe data JSONB untuk options dan correct_answer_config.

[x] Task 1.4: Row Level Security (RLS) Implementation

Aktifkan RLS di semua tabel.

Buat Policy: users can only see data where school_id matches their profile.school_id.

📌 Phase 2: Storage & Asset Optimization (Photo Feature)
Goal: Mengelola foto siswa dengan efisiensi kuota Free Tier (1GB).

[ ] Task 2.1: Storage Bucket Setup

Buat bucket assets dengan public access terbatas.

[ ] Task 2.2: Image Processing Logic

Implementasi client-side compression sebelum upload (maksimal 50KB/foto, format WebP).

📌 Phase 3: Auth & API Refactoring (Logic Migration)
Goal: Menggantikan code.gs dan api.ts dengan Supabase Client.

[ ] Task 3.1: Supabase Client Initialization

Buat src/lib/supabase.ts dan konfigurasi environment variables.

[ ] Task 3.2: Login & Session Rewrite

Ganti fungsi login di api.ts menggunakan supabase.auth.signInWithPassword.

[ ] Task 3.3: Fetching Questions with RLS

Ganti handleGetQuestions dengan query langsung ke Supabase yang otomatis terfilter oleh RLS.

[ ] Task 3.4: Scoring Engine Migration

Pindahkan logika penilaian dari handleSubmitExam ke dalam Database Function (RPC) di Supabase untuk mencegah manipulasi nilai di sisi client.

📌 Phase 4: Security & Licensing (Anti-Kabur Mechanism)
Goal: Melindungi hak cipta dan memastikan pembayaran klien.

[ ] Task 4.1: License Middleware

Buat middleware di Next.js yang mengecek license_status di tabel schools sebelum mengizinkan akses ke halaman /exam.

[ ] Task 4.2: Remote Kill-Switch

Buat dashboard "Super Admin" khusus Ahmad untuk mematikan akses school_id tertentu jika belum lunas.

📌 Phase 5: Admin & Demo Feature (Handoff Ready)
Goal: Mempermudah operasional guru dan persiapan demo.

[ ] Task 5.1: Multi-Tenant Dashboard

Update AdminLayout.tsx agar menampilkan logo dan nama sekolah sesuai school_id user yang login.

[ ] Task 5.2: Excel-to-Supabase Importer

Buat fungsi untuk upload soal masal yang langsung menyisipkan school_id otomatis.
