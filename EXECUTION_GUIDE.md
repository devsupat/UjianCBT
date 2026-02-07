# 📋 Execution Guide: Supabase Migration

## File yang Sudah Dibuat

| File | Task | Deskripsi |
|------|------|-----------|
| [`001_core_schema.sql`](file:///Users/macbookpro15/Documents/webappscript/UjianCBT/supabase/migrations/001_core_schema.sql) | 1.1, 1.2, 1.4 | Tables: `schools`, `profiles` + RLS policies |
| [`002_questions_schema.sql`](file:///Users/macbookpro15/Documents/webappscript/UjianCBT/supabase/migrations/002_questions_schema.sql) | 1.3 | Table: `questions` dengan JSONB + RLS |

---

## 🚀 Langkah Eksekusi di Supabase

### Step 1: Buka Supabase Dashboard
1. Login ke [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Pilih project: **bpusmttzowobkldepehk**
3. Navigasi ke **SQL Editor** (icon di sidebar kiri)

### Step 2: Execute Migration Files (BERURUTAN!)

#### A. Execute `001_core_schema.sql` Terlebih Dahulu
```sql
-- Copy seluruh isi dari 001_core_schema.sql
-- Paste ke SQL Editor
-- Klik "RUN" (atau Ctrl/Cmd + Enter)
```

**Hasil yang diharapkan:**
- ✅ Table `schools` created
- ✅ Table `profiles` created  
- ✅ RLS policies enabled
- ✅ Trigger `on_auth_user_created` created

#### B. Execute `002_questions_schema.sql` Setelahnya
```sql
-- Copy seluruh isi dari 002_questions_schema.sql
-- Paste ke SQL Editor
-- Klik "RUN"
```

**Hasil yang diharapkan:**
- ✅ Table `questions` created
- ✅ RLS policies for questions enabled
- ✅ Indexes created

---

## ✅ Verification Checklist

Setelah execute kedua SQL file:

- [ ] Verify tables exist: **Table Editor** → cek `schools`, `profiles`, `questions`
- [ ] Verify RLS enabled: Setiap table harus ada **RLS badge** 🔒
- [ ] Test insert data dummy:
  ```sql
  -- Test insert school
  INSERT INTO schools (name, license_status) 
  VALUES ('SMP Test', true);
  
  -- Cek hasilnya
  SELECT * FROM schools;
  ```

---

## 🔥 Next Steps (Phase 2 & 3)

Setelah database ready:

| Phase | Task | Prioritas |
|-------|------|-----------|
| **Phase 2** | Storage bucket untuk foto siswa | Medium |
| **Phase 3** | Login & Session dengan Supabase Auth | 🔴 High |
| **Phase 3** | Fetch Questions from Supabase | 🔴 High |
| **Phase 3** | Scoring Engine (RPC Function) | 🔴 High |

---

## 🐛 Troubleshooting

### Error: "relation auth.users does not exist"
**Solution:** Pastikan Supabase Auth sudah enabled di project settings.

### Error: "foreign key constraint"
**Solution:** Execute `001_core_schema.sql` **SEBELUM** `002_questions_schema.sql`.

### Error: "policy already exists"
**Solution:** Drop policy terlebih dahulu atau gunakan `CREATE OR REPLACE POLICY`.
