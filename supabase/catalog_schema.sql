-- SQL Schema for eLibrary Cataloging Module
-- Includes Categories, Publishers, Authors, Books, and Book-Authors tables

-- 1. BOOK CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  ddc_code TEXT UNIQUE, -- Dewey Decimal Classification code (e.g. 800 for Literature)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. PUBLISHERS
CREATE TABLE IF NOT EXISTS public.publishers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. AUTHORS
CREATE TABLE IF NOT EXISTS public.authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. BOOKS
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  isbn TEXT UNIQUE, -- International Standard Book Number
  ddc TEXT, -- Dewey Decimal Classification (specific book classification)
  barcode TEXT UNIQUE, -- Barcode data (usually same as ISBN or custom)
  qr_code TEXT UNIQUE, -- QR Code data
  cover_url TEXT, -- URL to uploaded cover image
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  publisher_id UUID REFERENCES public.publishers(id) ON DELETE SET NULL,
  publish_year INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_quantity CHECK (quantity >= 0),
  available_quantity INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_avail_quantity CHECK (available_quantity >= 0 AND available_quantity <= quantity),
  status TEXT NOT NULL DEFAULT 'tersedia' CONSTRAINT chk_status CHECK (status IN ('tersedia', 'dipinjam', 'hilang', 'rusak')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. BOOK AUTHORS (Many-to-Many Junction)
CREATE TABLE IF NOT EXISTS public.book_authors (
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.authors(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_authors ENABLE ROW LEVEL SECURITY;

-- Select/Read Policies: Available for all authenticated users
CREATE POLICY "Allow select for categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for publishers" ON public.publishers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for authors" ON public.authors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for book_authors" ON public.book_authors FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete Policies: Restricted to Admin and Staff (Petugas, Kepala Perpustakaan)
-- Helper to check if active user is admin/staff
CREATE OR REPLACE FUNCTION public.is_library_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('administrator', 'kepala_perpustakaan', 'petugas') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Write access policies for Categories
CREATE POLICY "Allow write for categories" ON public.categories FOR ALL TO authenticated 
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Write access policies for Publishers
CREATE POLICY "Allow write for publishers" ON public.publishers FOR ALL TO authenticated 
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Write access policies for Authors
CREATE POLICY "Allow write for authors" ON public.authors FOR ALL TO authenticated 
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Write access policies for Books
CREATE POLICY "Allow write for books" ON public.books FOR ALL TO authenticated 
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Write access policies for Book Authors
CREATE POLICY "Allow write for book_authors" ON public.book_authors FOR ALL TO authenticated 
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- ----------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_category_id ON public.books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_publisher_id ON public.books(publisher_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);
CREATE INDEX IF NOT EXISTS idx_book_authors_author_id ON public.book_authors(author_id);

-- ----------------------------------------------------
-- AUTO UPDATE TIMESTAMPS
-- ----------------------------------------------------
CREATE TRIGGER on_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_publishers_updated BEFORE UPDATE ON public.publishers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_authors_updated BEFORE UPDATE ON public.authors FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_books_updated BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------
-- SEED DATA FOR TESTING CATALOG
-- ----------------------------------------------------
-- Categories (Dewey Decimal Classification)
INSERT INTO public.categories (name, description, ddc_code) VALUES
('Karya Fiksi & Sastra', 'Novel fiksi, cerpen, antologi puisi, karya drama', '800'),
('Karya Ilmiah & Teknologi', 'Buku ajar sains, ensiklopedia teknologi, buku matematika', '500'),
('Sejarah & Geografi', 'Buku sejarah dunia, peta, biografi sejarah', '900'),
('Filsafat & Psikologi', 'Pengantar filsafat, buku pengembangan diri, motivasi', '100'),
('Agama & Spiritualitas', 'Buku keagamaan dan studi perbandingan agama', '200')
ON CONFLICT (name) DO NOTHING;

-- Authors
INSERT INTO public.authors (name, bio) VALUES
('Andrea Hirata', 'Penulis novel terkenal Laskar Pelangi asal Belitung, Indonesia.'),
('Pramoedya Ananta Toer', 'Sastrawan terkemuka Indonesia, penulis Tetralogi Buru.'),
('Tere Liye', 'Penulis novel fiksi populer produktif di Indonesia.'),
('Dewi Lestari (Dee)', 'Penulis fiksi sains populer dan seri novel Supernova.')
ON CONFLICT (name) DO NOTHING;

-- Publishers
INSERT INTO public.publishers (name, address, phone, email) VALUES
('Gramedia Pustaka Utama', 'Jl. Palmerah Barat 29-37, Jakarta', '021-53650110', 'redaksi@gramediapustakautama.com'),
('Bentang Pustaka', 'Jl. Kaliurang KM 5.5, Yogyakarta', '0274-889242', 'info@bentangpustaka.com'),
('Republika Penerbit', 'Jl. Warung Buncit Raya No. 37, Jakarta', '021-7819127', 'redaksi@penerbitrepublika.com')
ON CONFLICT (name) DO NOTHING;
