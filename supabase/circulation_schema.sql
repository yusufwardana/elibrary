-- SQL Schema for eLibrary Circulation Module
-- Includes Borrowings, Borrow Details, Returns, and Reservations tables

-- 1. BORROWINGS (Header Table)
CREATE TABLE IF NOT EXISTS public.borrowings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  borrow_date DATE DEFAULT CURRENT_DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif' CONSTRAINT chk_borrow_status CHECK (status IN ('aktif', 'kembali', 'terlambat')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Staff who processed it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. BORROW DETAILS (Line Items Table)
CREATE TABLE IF NOT EXISTS public.borrow_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrowing_id UUID REFERENCES public.borrowings(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE RESTRICT NOT NULL,
  return_status TEXT NOT NULL DEFAULT 'dipinjam' CONSTRAINT chk_detail_status CHECK (return_status IN ('dipinjam', 'kembali')),
  returned_at TIMESTAMP WITH TIME ZONE
);

-- 3. RETURNS LOG
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrowing_id UUID REFERENCES public.borrowings(id) ON DELETE RESTRICT NOT NULL,
  borrow_detail_id UUID REFERENCES public.borrow_details(id) ON DELETE RESTRICT,
  return_date DATE DEFAULT CURRENT_DATE NOT NULL,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Staff who processed return
  fine_amount NUMERIC NOT NULL DEFAULT 0 CONSTRAINT chk_fine_amt CHECK (fine_amount >= 0),
  fine_paid NUMERIC NOT NULL DEFAULT 0 CONSTRAINT chk_fine_paid CHECK (fine_paid >= 0),
  payment_status TEXT NOT NULL DEFAULT 'tidak_ada' CONSTRAINT chk_pay_status CHECK (payment_status IN ('tidak_ada', 'belum_bayar', 'lunas')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. RESERVATIONS (Queue bookings when books are out of stock)
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  reservation_date DATE DEFAULT CURRENT_DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu' CONSTRAINT chk_res_status CHECK (status IN ('menunggu', 'selesai', 'dibatalkan', 'kedaluwarsa')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS
ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Read policies: Users can view their own, Staff can view all
CREATE POLICY "Allow read own borrowings" ON public.borrowings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_library_staff());

CREATE POLICY "Allow read own details" ON public.borrow_details FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrowings b
      WHERE b.id = borrowing_id AND (b.user_id = auth.uid() OR public.is_library_staff())
    )
  );

CREATE POLICY "Allow read own returns" ON public.returns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrowings b
      WHERE b.id = borrowing_id AND (b.user_id = auth.uid() OR public.is_library_staff())
    )
  );

CREATE POLICY "Allow read own reservations" ON public.reservations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_library_staff());

-- Write policies: restricted to Staff only
CREATE POLICY "Allow write for borrowings" ON public.borrowings FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

CREATE POLICY "Allow write for borrow_details" ON public.borrow_details FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

CREATE POLICY "Allow write for returns" ON public.returns FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Reservations write: Users can insert/cancel their own, Staff can edit all
CREATE POLICY "Allow insert own reservation" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own reservation" ON public.reservations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_library_staff())
  WITH CHECK (auth.uid() = user_id OR public.is_library_staff());

-- ----------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON public.borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON public.borrowings(status);
CREATE INDEX IF NOT EXISTS idx_borrow_details_borrowing_id ON public.borrow_details(borrowing_id);
CREATE INDEX IF NOT EXISTS idx_borrow_details_book_id ON public.borrow_details(book_id);
CREATE INDEX IF NOT EXISTS idx_returns_borrowing_id ON public.returns(borrowing_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON public.reservations(book_id);

-- ----------------------------------------------------
-- AUTOMATIC DATABASE TRIGGERS
-- ----------------------------------------------------

-- Trigger 1: Decrease stock on borrow details insert
CREATE OR REPLACE FUNCTION public.decrease_book_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate stock availability
  IF NOT EXISTS (
    SELECT 1 FROM public.books
    WHERE id = NEW.book_id AND available_quantity > 0 AND status = 'tersedia'
  ) THEN
    RAISE EXCEPTION 'Buku tidak tersedia untuk dipinjam (stok kosong)';
  END IF;

  UPDATE public.books
  SET 
    available_quantity = available_quantity - 1,
    status = CASE WHEN available_quantity - 1 = 0 THEN 'dipinjam' ELSE 'tersedia' END
  WHERE id = NEW.book_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_borrow_detail_created
  BEFORE INSERT ON public.borrow_details
  FOR EACH ROW EXECUTE FUNCTION public.decrease_book_stock();

-- Trigger 2: Restore stock on return status change
CREATE OR REPLACE FUNCTION public.restore_book_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changes from dipinjam to kembali
  IF OLD.return_status = 'dipinjam' AND NEW.return_status = 'kembali' THEN
    UPDATE public.books
    SET 
      available_quantity = available_quantity + 1,
      status = 'tersedia'
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_borrow_detail_returned
  AFTER UPDATE ON public.borrow_details
  FOR EACH ROW EXECUTE FUNCTION public.restore_book_stock();

-- Trigger 3: General updated_at timestamps
CREATE TRIGGER on_borrowings_updated BEFORE UPDATE ON public.borrowings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_reservations_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
