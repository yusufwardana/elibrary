# Dokumentasi Database eLibrary — PostgreSQL & Supabase

Dokumen ini memuat detail struktur tabel, constraint, foreign keys, triggers, RLS, dan indeks performa database PostgreSQL pada eLibrary.

---

## 1. Modul Otentikasi & Profil Pengguna (`schema.sql`)

### Tabel `profiles`
Menyimpan data biodata pengguna yang terhubung langsung dengan Supabase Auth `auth.users`.
-   `id` UUID Primary Key REFERENCES `auth.users(id)` ON DELETE CASCADE.
-   `email` TEXT NOT NULL.
-   `full_name` TEXT NOT NULL.
-   `avatar_url` TEXT NULL (Pranala berkas avatar di Supabase Storage).
-   `role` UserRole NOT NULL (administrator, kepala_perpustakaan, petugas, guru, siswa) DEFAULT 'siswa'.
-   `is_active` BOOLEAN DEFAULT TRUE.

#### Triggers
-   `on_auth_user_created`: Otomatis menyalin data registrasi pengguna baru dari `auth.users` ke `public.profiles`.

---

## 2. Modul Katalog Buku (`catalog_schema.sql`)

### Tabel `categories`
Klasifikasi buku perpustakaan (DDC).
-   `id` UUID Primary Key.
-   `name` TEXT NOT NULL UNIQUE (e.g., Sains, Novel).

### Tabel `publishers`
Penerbit buku.
-   `id` UUID Primary Key.
-   `name` TEXT NOT NULL.

### Tabel `authors`
Penulis buku.
-   `id` UUID Primary Key.
-   `name` TEXT NOT NULL.

### Tabel `books`
Koleksi buku perpustakaan.
-   `id` UUID Primary Key.
-   `title` TEXT NOT NULL.
-   `isbn` TEXT UNIQUE NULL.
-   `ddc` TEXT NULL.
-   `publisher_id` UUID REFERENCES `publishers(id)`.
-   `quantity` INTEGER NOT NULL DEFAULT 1.
-   `available_quantity` INTEGER NOT NULL DEFAULT 1.
-   `cover_url` TEXT NULL.

#### Triggers
-   `on_books_updated`: Mengubah kolom `updated_at` saat data buku diubah.

---

## 3. Modul Sirkulasi Perpustakaan (`circulation_schema.sql`)

### Tabel `borrowings`
Log peminjaman buku perpustakaan.
-   `id` UUID Primary Key.
-   `user_id` UUID REFERENCES `profiles(id)`.
-   `borrow_date` DATE NOT NULL DEFAULT CURRENT_DATE.
-   `due_date` DATE NOT NULL.
-   `return_date` DATE NULL.
-   `status` TEXT (dipinjam, kembali, terlambat).
-   `fine_amount` NUMERIC DEFAULT 0.
-   `fine_status` TEXT (lunas, belum_lunas).

### Tabel `borrow_details`
Detail relasi multi-buku dalam satu transaksi peminjaman.
-   `id` UUID Primary Key.
-   `borrowing_id` UUID REFERENCES `borrowings(id)` ON DELETE CASCADE.
-   `book_id` UUID REFERENCES `books(id)`.

### Tabel `reservations`
Antrean reservasi buku yang sedang habis dipinjam.
-   `id` UUID Primary Key.
-   `user_id` UUID REFERENCES `profiles(id)`.
-   `book_id` UUID REFERENCES `books(id)`.
-   `status` TEXT (menunggu, disiapkan, diambil, batal) DEFAULT 'menunggu'.

#### Triggers
-   `trg_borrow_stock_update`: Mengurangi `available_quantity` di tabel `books` ketika status peminjaman bernilai `dipinjam`.
-   `trg_return_stock_update`: Mengembalikan `available_quantity` di tabel `books` ketika buku dikembalikan (`status = kembali`).

---

## 4. Modul Administrasi & Akreditasi (`admin_schema.sql`)

### Tabel `accreditation_documents`
Berkas administrasi 11 standar akreditasi perpustakaan sekolah SNP.
-   `id` UUID Primary Key.
-   `name` TEXT NOT NULL.
-   `category` TEXT NOT NULL (visi_misi, struktur, sop, rencana_tahunan, jadwal_layanan, dll).
-   `file_url` TEXT NOT NULL (Pranala berkas pdf di Supabase Storage).
-   `status` TEXT NOT NULL DEFAULT 'draft' (draft, review, disetujui, arsip).

### Tabel `document_versions`
Log riwayat revisi berkas akreditasi.
-   `id` UUID Primary Key.
-   `document_id` UUID REFERENCES `accreditation_documents(id)` ON DELETE CASCADE.
-   `version` INTEGER NOT NULL DEFAULT 1.
-   `file_url` TEXT NOT NULL.
-   `notes` TEXT NULL.

---

## 5. Modul Inventaris Barang (`inventory_schema.sql`)

### Tabel `inventory_assets`
Daftar sarana prasarana sekolah.
-   `id` UUID Primary Key.
-   `name` TEXT NOT NULL.
-   `category` TEXT CONSTRAINT chk_cat CHECK (category IN (rak_buku, meja, kursi, komputer, printer, jaringan, ac, proyektor, scanner)).
-   `asset_code` TEXT UNIQUE NOT NULL.
-   `condition` TEXT (baik, rusak_ringan, rusak_berat) DEFAULT 'baik'.

### Tabel `asset_maintenance`
Rencana pemeliharaan rutin prasarana.
-   `id` UUID Primary Key.
-   `asset_id` UUID REFERENCES `inventory_assets(id)` ON DELETE CASCADE.
-   `maintenance_date` DATE NOT NULL.
-   `cost` NUMERIC DEFAULT 0.

### Tabel `asset_damage_reports`
Laporan aduan kerusakan prasarana.
-   `id` UUID Primary Key.
-   `asset_id` REFERENCES `inventory_assets(id)`.
-   `description` TEXT NOT NULL.
-   `status` TEXT (dilaporkan, perbaikan, selesai, dibuang) DEFAULT 'dilaporkan'.

---

## 6. Modul Gerakan Literasi Sekolah (`literacy_schema.sql`)

### Tabel `reading_journals`
Jurnal harian kemajuan membaca siswa.
-   `id` UUID Primary Key.
-   `user_id` UUID REFERENCES `profiles(id)` ON DELETE CASCADE.
-   `book_title` TEXT NOT NULL.
-   `summary` TEXT NOT NULL (Ringkasan sinopsis).
-   `pages_read` INTEGER NOT NULL.
-   `is_verified` BOOLEAN DEFAULT FALSE.
-   `verified_by` UUID REFERENCES `profiles(id)`.

---

## ⚡ Indeks Performa & Optimasi Database

Untuk menjamin latensi rendah saat pencarian data (Query Latency < 100ms), indeks berikut dikonfigurasi:
1.  `idx_books_title`: Indeks pencarian judul buku.
2.  `idx_books_isbn`: Indeks unik pencarian nomor ISBN.
3.  `idx_borrowings_user_status`: Indeks filter gabungan user dan status peminjaman.
4.  `idx_reading_journals_user`: Indeks filter jurnal siswa.
5.  `idx_asset_condition`: Indeks filter prasarana inventaris berdasarkan tingkat kerusakan.
