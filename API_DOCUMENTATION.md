# Dokumentasi API Server Actions — eLibrary

Seluruh transaksi data antara antarmuka React Client Components dan PostgreSQL/Supabase di eLibrary dikelola menggunakan Next.js Server Actions. Hal ini mengurangi kebutuhan routing API HTTP eksternal dan meningkatkan keamanan melalui validasi sisi server.

---

## 1. Modul Otentikasi (`src/app/auth/actions.ts`)

### `loginAction`
Melakukan otentikasi alamat surel (email) dan kata sandi menggunakan Supabase Auth.
-   **Parameter**: `formData: FormData` (memuat `email` dan `password`).
-   **Response**: `Promise<{ success: boolean; error?: string }>`
-   **Protokol Keamanan**: Menulis cookie token JWT `HttpOnly` di browser untuk validasi route guard.

### `logoutAction`
Menghapus sesi otentikasi aktif dan membersihkan cookies.
-   **Response**: `Promise<void>`

### `forgotPasswordAction`
Mengirimkan pranala pemulihan kata sandi ke surel pengguna.
-   **Parameter**: `email: string`
-   **Response**: `Promise<{ success: boolean; error?: string }>`

---

## 2. Modul Katalog Buku (`src/app/(dashboard)/books/actions.ts`)

### `getBooksList`
Mengambil data koleksi buku lengkap perpustakaan.
-   **Response**: `Promise<Book[]>`

### `createBookAction`
Menambahkan judul buku baru ke dalam katalog.
-   **Parameter**: `formData: FormData` (memuat `title`, `isbn`, `ddc`, `quantity`, `cover` file).
-   **Response**: `Promise<Book>`
-   **RLS Check**: Hanya dapat dipanggil jika token pengguna terverifikasi sebagai staf perpustakaan.

---

## 3. Modul Sirkulasi (`src/app/(dashboard)/loans/actions.ts`)

### `createBorrowAction`
Mendaftarkan transaksi peminjaman buku baru untuk anggota.
-   **Parameter**:
    -   `userId: string`
    -   `bookIds: string[]`
    -   `dueDate: string`
-   **Response**: `Promise<Borrowing>`
-   **Stock Check**: Mengurangi `available_quantity` buku. Transaksi ditolak jika stok habis.

### `processReturnAction`
Memproses pengembalian buku dan menghitung denda jika terlambat.
-   **Parameter**: `borrowingId: string`
-   **Response**: `Promise<{ success: boolean; fine: number }>`
-   **Formula Denda**: `Keterlambatan (Hari) * Rp 1.000`

---

## 4. Modul Administrasi & Akreditasi (`src/app/(dashboard)/admin/actions.ts`)

### `uploadDocumentAction`
Mengunggah berkas penunjang standar akreditasi perpustakaan sekolah SNP.
-   **Parameter**: `formData: FormData` (memuat `name`, `category`, `file` PDF).
-   **Response**: `Promise<AccreditationDocument>`

---

## 5. Modul Inventaris (`src/app/(dashboard)/inventory/actions.ts`)

### `createAssetAction`
Mendaftarkan sarana prasarana baru ke dalam inventaris prasarana sekolah.
-   **Parameter**: `formData: FormData` (memuat `name`, `category`, `location`, `purchase_date`, `photo`).
-   **Response**: `Promise<InventoryAsset>`

### `createDamageReportAction`
Melaporkan indikasi kerusakan prasarana sekolah.
-   **Parameter**:
    -   `assetId: string`
    -   `description: string`
    -   `condition: 'rusak_ringan' | 'rusak_berat'`
-   **Response**: `Promise<DamageReport>`

---

## 6. Modul Gerakan Literasi Sekolah (`src/app/(dashboard)/literacy/actions.ts`)

### `createReadingJournalAction`
Mencatat kemajuan 15 menit membaca harian siswa.
-   **Parameter**:
    -   `bookTitle: string`
    -   `author: string`
    -   `summary: string`
    -   `pagesRead: number`
-   **Response**: `Promise<ReadingJournal>`

### `verifyReadingJournalAction`
Umpan balik verifikasi guru pendamping atas ringkasan kemajuan membaca siswa.
-   **Parameter**:
    -   `journalId: string`
    -   `teacherNotes: string`
    -   `approve: boolean`
-   **Response**: `Promise<{ success: boolean }>`
