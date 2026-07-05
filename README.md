# eLibrary — Sistem Manajemen Perpustakaan Sekolah Terintegrasi

Sistem Manajemen Perpustakaan Sekolah Terintegrasi Standar Nasional Perpustakaan (SNP) berbasis Next.js 16 App Router, React 19, TypeScript, TailwindCSS v4, shadcn/ui, dan Supabase Auth & Storage.

---

## 🚀 Fitur Utama

1.  **Dashboard Eksekutif**: Ringkasan data transaksional realtime, grafik sirkulasi bulanan, dan kelengkapan akreditasi SNP.
2.  **Sistem Otentikasi & RLS**: Login, lupa sandi, reset sandi, verifikasi sesi, dan RLS tingkat tabel (Administrator, Kepala Perpustakaan, Petugas, Guru, Siswa).
3.  **Katalog Buku**: CRUD buku, author, penerbit, kategori, stock control, serta generator Barcode Code 128 dan QR Code SVG.
4.  **Sirkulasi & Peminjaman**: Peminjaman, pengembalian otomatis dengan kalkulasi denda keterlambatan, reservation queue, dan receipt generator.
5.  **Administrasi & Akreditasi**: Checklist 11 standar SNP, unggah berkas akreditasi ke Supabase Storage, kontrol status persetujuan, dan logs versi dokumen.
6.  **Inventaris Barang**: Manajemen sarana prasarana sekolah, jadwal pemeliharaan preventif berkala, laporan kerusakan prasarana, dan histori servis perbaikan.
7.  **Gerakan Literasi Sekolah (GLS)**: Jurnal membaca harian siswa 15 menit, monitoring persetujuan guru, event galeri kompetisi, dan badge pencapaian.

---

## 🛠️ Tech Stack & Konfigurasi Produksi

-   **Core**: Next.js 16.2.10 (App Router), React 19.2.4 (React Compiler enabled), TypeScript.
-   **Styling**: TailwindCSS v4 (CSS-first configuration), CSS HSL custom variables.
-   **UI & Animations**: shadcn/ui, Framer Motion v12, Lucide React.
-   **Data Queries**: TanStack Query v5 (React Query), TanStack Table v8, React Hook Form + Zod validation.
-   **Database & Storage**: Supabase (PostgreSQL), Supabase Auth SSR, Supabase Storage buckets.
-   **Route Protection**: Next.js 16 Auth Proxy (`src/proxy.ts` on Node.js runtime) shielding `/dashboard*` routes.

---

## 📁 Struktur Direktori Proyek

```
elibrary/
├── .env.local.example            # Environment template configuration
├── components.json               # shadcn/ui configuration
├── next.config.ts                # Next.js compiler settings
├── src/
│   ├── app/                      # Next.js App Router (Auth / Dashboard Pages)
│   ├── components/               # Layouts, Navbar, Sidebar & UI controls
│   ├── hooks/                    # useSidebar Custom React hook
│   ├── lib/                      # Supabase SSR clients, site config, constants
│   ├── providers/                # ThemeProvider, QueryProvider, SidebarProvider
│   └── proxy.ts                  # Edge-compatible Auth Route Proxy (Middleware)
├── supabase/                     # PostgreSQL Schemas, Triggers, RLS, and seed scripts
│   ├── schema.sql                # User profiles, buckets, functions RLS
│   ├── catalog_schema.sql        # Book categories, authors, barcodes
│   ├── circulation_schema.sql    # Borrowings, returns, fine computations
│   ├── admin_schema.sql          # Accreditation files, version history
│   ├── inventory_schema.sql      # Assets inventory, servicing logs
│   └── literacy_schema.sql       # Reading journals, programs, achievements
└── package.json                  # Dependencies configuration
```

---

## 🔧 Panduan Instalasi Lokal

1.  **Kloning Proyek & Pasang Dependensi**:
    ```bash
    npm install
    ```
2.  **Konfigurasi Variabel Lingkungan**:
    Salin berkas `.env.local.example` menjadi `.env.local` dan lengkapi kredensial Supabase Anda:
    ```
    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```
3.  **Jalankan Migrasi Database**:
    Jalankan berkas-berkas SQL di folder `supabase/` pada konsol SQL Supabase Anda secara berurutan.
4.  **Jalankan Server Development**:
    ```bash
    npm run dev
    ```
5.  **Periksa Kode Lint & Build Produksi**:
    ```bash
    npm run lint
    npm run build
    ```

---

## 🔒 Strategi Keamanan & RLS

-   **Database Row Level Security (RLS)**:
    -   Tabel `profiles`: Dapat diubah oleh pemilik profil.
    -   Tabel `books` / `inventory_assets` / `accreditation_documents`: Operasi tulis dibatasi hanya untuk staf perpustakaan melalui pengecekan role `is_library_staff()`.
    -   Tabel `borrowings` / `reading_journals`: Pembacaan terbatas untuk pemilik data dan staf perpustakaan.
-   **Security Controls**:
    -   Next.js 16 Auth Proxy melakukan evaluasi token JWT di sisi server untuk membatasi akses URL `/dashboard*`.
    -   Pemberian token cookie Supabase menggunakan flag `HttpOnly`, `Secure`, dan `SameSite=Lax`.

---

## 💾 Strategi Backup & Pemulihan (Disaster Recovery)

1.  **Backup Database PostgreSQL**:
    Disarankan menggunakan penjadwalan `cron` mingguan atau harian via tool CLI pg_dump Supabase:
    ```bash
    pg_dump -h db.your-project.supabase.co -U postgres -d postgres -F c -b -v -f elibrary_backup.dump
    ```
2.  **Pemulihan Database**:
    ```bash
    pg_restore -h db.your-project.supabase.co -U postgres -d postgres -v elibrary_backup.dump
    ```
3.  **Backup Storage Object**:
    Sikronisasi berkas media pada bucket `documents` ke cloud server lokal menggunakan rclone atau SDK AWS S3.
