CBT SaaS Platform
📌 Project Overview
Proyek ini adalah migrasi sistem Ujian CBT Online dari Google Apps Script + Google Sheets ke Next.js + Supabase. Fokus utamanya adalah transformasi menjadi platform SaaS Multi-tenant yang aman, efisien, dan siap skala industri.

🏗️ Core Architecture Principles
Strict Multi-tenancy: Semua data (Siswa, Soal, Hasil) wajib memiliki kolom school_id.

Zero-Trust Security (RLS): Keamanan data antar sekolah dikunci di tingkat database menggunakan Supabase Row Level Security (RLS). Tidak boleh ada kebocoran data antar school_id.

Free-Tier Optimization: Strategi penggunaan resource (Storage & Database) dioptimalkan agar tetap masuk dalam kuota gratis Supabase selama mungkin.

Anti-Cheat System: Mempertahankan fitur deteksi pindah tab (tab switching) dan integrasi PIN ujian.

🗄️ Database Schema Reference
schools: Master data sekolah/instansi. Memiliki kolom license_status sebagai kill-switch akses.

profiles: Extensi dari auth.users. Menyimpan school_id, full_name, dan role (ADMIN atau STUDENT).

questions: Data soal dengan dukungan tipe SINGLE, COMPLEX, dan TRUE_FALSE_MULTI. Menggunakan format JSONB untuk opsi dan kunci jawaban agar fleksibel.

responses: Hasil ujian siswa beserta log pelanggaran (violation).

🔑 Authentication & Authorization
Menggunakan Supabase Auth.

Setiap login siswa/admin akan mengambil school_id dari tabel profiles.

Akses ke fitur admin dibatasi hanya untuk user dengan role = 'ADMIN'.

📸 Student Photo Strategy
Bucket: student-photos.

Optimization: Wajib menggunakan kompresi client-side (Format: .webp, Max Size: 50KB, Max Res: 300x400px).

Access: Diatur melalui Storage Policies agar hanya admin sekolah terkait yang bisa mengelola foto siswanya.

📝 Business Logic (Scoring Rules)
Logika penilaian mengacu pada code.gs lama:

SINGLE: Pilihan tunggal, skor penuh jika benar.

COMPLEX: Pilihan ganda kompleks, skor penuh jika semua pilihan benar sesuai kunci.

TRUE_FALSE_MULTI: Penilaian proporsional berdasarkan jumlah pernyataan yang dijawab benar.

🛡️ Security & Licensing ("Anti-Kabur")
Status Lisensi: Pengecekan kolom license_status di tabel schools pada setiap entry point ujian.

Deployment Control: Selama masa pengembangan/demo, aplikasi di-hosting di akun Vercel & Supabase milik pengembang (Ahmad). Handoff ke akun klien hanya dilakukan setelah pelunasan 100%.

🚀 How to Assist
Saat membantu pengembangan, Claude wajib:

Membaca file tasks.md untuk mengetahui progres tugas terakhir.

Selalu menyertakan filter school_id dalam setiap query SELECT, UPDATE, atau DELETE.

Memastikan setiap komponen UI baru mendukung identitas sekolah (Logo & Nama) secara dinamis.

Tips Penggunaan:
Setiap kali Anda membuka chat baru dengan AI, cukup katakan:

"Tolong baca CLAUDE_CONTEXT.md dan tasks.md. Berikan ringkasan progres kita sekarang dan apa langkah selanjutnya."

Dengan file ini, Anda tidak perlu lagi menjelaskan dari awal tentang school_id, RLS, atau ketakutan Anda soal klien yang belum membayar. Claude akan langsung paham konteksnya.

NEXT_PUBLIC_SUPABASE_URL = https://bpusmttzowobkldepehk.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdXNtdHR6b3dvYmtsZGVwZWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MjY1NDMsImV4cCI6MjA4NjAwMjU0M30.bhqvG3Qjxijw0j42210FyuqAvBklnI8n9iODAOi86Mg

SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdXNtdHR6b3dvYmtsZGVwZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQyNjU0MywiZXhwIjoyMDg2MDAyNTQzfQ.dodVJeze8haIRRNe0hmwWVvHaMkOP3c31y_Ve3Ff5JQ


(Untuk bypass RLS saat Ahmad melakukan maintenance)