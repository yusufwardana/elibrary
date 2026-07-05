-- SQL Schema for eLibrary Library Accreditation Module (SNP Standar Nasional Perpustakaan)
-- Includes Categories, Requirements, Submissions, and Versions tables

-- 1. ACCREDITATION CATEGORIES (8 Standards of SNP)
CREATE TABLE IF NOT EXISTS public.accreditation_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ACCREDITATION REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.accreditation_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.accreditation_categories(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. ACCREDITATION SUBMISSIONS (Evidence)
CREATE TABLE IF NOT EXISTS public.accreditation_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID REFERENCES public.accreditation_requirements(id) ON DELETE CASCADE NOT NULL UNIQUE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CONSTRAINT chk_sub_status CHECK (status IN ('draft', 'review', 'disetujui', 'arsip')),
  notes TEXT,
  assessor_comments TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. ACCREDITATION SUBMISSION VERSIONS (Revisions log)
CREATE TABLE IF NOT EXISTS public.accreditation_submission_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.accreditation_submissions(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  notes TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS
ALTER TABLE public.accreditation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_submission_versions ENABLE ROW LEVEL SECURITY;

-- Read policies: Logged-in users can read everything
CREATE POLICY "Allow read categories for all authenticated" ON public.accreditation_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read requirements for all authenticated" ON public.accreditation_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read submissions for all authenticated" ON public.accreditation_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read versions for all authenticated" ON public.accreditation_submission_versions FOR SELECT TO authenticated USING (true);

-- Write policies: restricted to library staff only (Admin, Kepala, Petugas)
CREATE POLICY "Allow write categories for staff" ON public.accreditation_categories FOR ALL TO authenticated USING (public.is_library_staff());
CREATE POLICY "Allow write requirements for staff" ON public.accreditation_requirements FOR ALL TO authenticated USING (public.is_library_staff());
CREATE POLICY "Allow write submissions for staff" ON public.accreditation_submissions FOR ALL TO authenticated USING (public.is_library_staff());
CREATE POLICY "Allow write versions for staff" ON public.accreditation_submission_versions FOR ALL TO authenticated USING (public.is_library_staff());

-- ----------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_req_category_id ON public.accreditation_requirements(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_requirement_id ON public.accreditation_submissions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON public.accreditation_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ver_submission_id ON public.accreditation_submission_versions(submission_id);

-- ----------------------------------------------------
-- AUTO UPDATE TIMESTAMPS
-- ----------------------------------------------------
CREATE TRIGGER on_accreditation_submissions_updated BEFORE UPDATE ON public.accreditation_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------
-- SEED DATA FOR THE 8 SNP CATEGORIES & REQUIREMENTS
-- ----------------------------------------------------

-- Clear first to avoid duplicate conflicts
DELETE FROM public.accreditation_categories;

-- Insert the 8 categories
INSERT INTO public.accreditation_categories (id, name, description) VALUES
('c1000000-0000-0000-0000-000000000001', '1. Administrasi dan Legalitas', 'Berkas keabsahan hukum, SK kelembagaan perpustakaan, dan perizinan resmi'),
('c2000000-0000-0000-0000-000000000002', '2. Koleksi', 'Kebijakan pengembangan bahan pustaka, inventarisasi, dan klasifikasi buku'),
('c3000000-0000-0000-0000-000000000003', '3. Pengelolaan dan Sirkulasi', 'Prosedur peminjaman, pengembalian, klasifikasi DDC, dan rekapitulasi data sirkulasi'),
('c4000000-0000-0000-0000-000000000004', '4. Sarana dan Prasarana', 'Denah tata letak, kecukupan rak buku, meja baca, sarana TIK, dan kenyamanan fisik'),
('c5000000-0000-0000-0000-000000000005', '5. Layanan', 'Jam layanan, tata tertib pengunjung, program bimbingan literasi, dan sirkulasi digital'),
('c6000000-0000-0000-0000-000000000006', '6. Program Literasi Sekolah', 'Gerakan Literasi Sekolah (GLS), jurnal membaca mandiri harian, lomba, dan galeri resensi'),
('c7000000-0000-0000-0000-000000000007', '7. Tenaga Perpustakaan', 'SK Kepala Perpustakaan, pembagian tugas staf, dan sertifikasi kompetensi diklat'),
('c8000000-0000-0000-0000-000000000008', '8. Evaluasi dan Pengembangan', 'Rencana kerja tahunan perpustakaan, evaluasi kepuasan anggota, dan laporan anggaran keuangan');

-- Insert required documents checklists for each category
INSERT INTO public.accreditation_requirements (category_id, document_name, description) VALUES
-- C1: Administrasi
('c1000000-0000-0000-0000-000000000001', 'SK Pendirian Perpustakaan Sekolah', 'Keputusan pendirian resmi dari yayasan atau dinas pendidikan setempat'),
('c1000000-0000-0000-0000-000000000001', 'Nomor Pokok Perpustakaan (NPP)', 'Sertifikat NPP resmi dari Perpustakaan Nasional RI'),
('c1000000-0000-0000-0000-000000000001', 'Struktur Organisasi Perpustakaan', 'Bagan struktur dan pembagian deskripsi kerja staf pengelola'),

-- C2: Koleksi
('c2000000-0000-0000-0000-000000000002', 'Laporan Inventarisasi Buku Lengkap', 'Rekap jumlah buku fiksi, non-fiksi, dan buku referensi wajib'),
('c2000000-0000-0000-0000-000000000002', 'Kebijakan Seleksi & Pengembangan Koleksi', 'Dokumen pedoman pengadaan bahan pustaka baru'),

-- C3: Pengelolaan & Sirkulasi
('c3000000-0000-0000-0000-000000000003', 'SOP Peminjaman & Pengembalian Buku', 'Alur standar transaksi peminjaman buku beserta kalkulasi denda'),
('c3000000-0000-0000-0000-000000000003', 'Statistik Laporan Sirkulasi Buku', 'Data rekapitulasi jumlah transaksi harian/bulanan perpustakaan'),

-- C4: Sarana & Prasarana
('c4000000-0000-0000-0000-000000000004', 'Denah & Tata Letak Ruang Perpustakaan', 'Denah fisik pembagian area baca, area sirkulasi, dan penyimpanan buku'),
('c4000000-0000-0000-0000-000000000004', 'Daftar Sarana TIK & Perangkat Lunak', 'Daftar komputer komputer, printer, printer barcode, dan scanner sirkulasi'),

-- C5: Layanan
('c5000000-0000-0000-0000-000000000005', 'Jadwal Layanan Perpustakaan', 'Ketetapan jam buka pelayanan bagi siswa dan guru'),
('c5000000-0000-0000-0000-000000000005', 'Tata Tertib Pengunjung Perpustakaan', 'Aturan kewajiban bagi seluruh anggota perpustakaan'),

-- C6: Program Literasi Sekolah
('c6000000-0000-0000-0000-000000000006', 'Panduan Gerakan Literasi Sekolah (GLS)', 'Program kerja wajib 15 menit membaca sebelum mulai belajar'),
('c6000000-0000-0000-0000-000000000006', 'Laporan Lomba Resensi & Review Buku', 'Dokumentasi agenda peningkatan budaya baca mandiri siswa'),

-- C7: Tenaga Perpustakaan
('c7000000-0000-0000-0000-000000000007', 'SK Pengangkatan Kepala Perpustakaan', 'Keputusan penunjukan Kepala Perpustakaan dari Kepala Sekolah'),
('c7000000-0000-0000-0000-000000000007', 'Sertifikat Kompetensi & Pelatihan Staf', 'Bukti sertifikasi diklat perpustakaan atau seminar kepustakaan'),

-- C8: Evaluasi & Pengembangan
('c8000000-0000-0000-0000-000000000008', 'Rencana Kerja Tahunan Perpustakaan', 'Rencana anggaran, agenda pengadaan, dan program kerja jangka panjang'),
('c8000000-0000-0000-0000-000000000008', 'Laporan Anggaran & Pertanggungjawaban', 'Laporan keuangan realisasi belanja operasional perpustakaan');
