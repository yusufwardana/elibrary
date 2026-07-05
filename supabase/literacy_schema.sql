-- SQL Schema for eLibrary School Literacy (GLS) Module
-- Includes Literacy Programs, Reading Journals, Events, and Achievements tables

-- 1. LITERACY PROGRAMS
CREATE TABLE IF NOT EXISTS public.literacy_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'aktif' CONSTRAINT chk_program_status CHECK (status IN ('aktif', 'selesai')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. READING JOURNALS (Daily student logs)
CREATE TABLE IF NOT EXISTS public.reading_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_title TEXT NOT NULL,
  author TEXT,
  summary TEXT NOT NULL,
  pages_read INTEGER NOT NULL CONSTRAINT chk_pages CHECK (pages_read > 0),
  read_date DATE DEFAULT CURRENT_DATE NOT NULL,
  teacher_notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. LITERACY EVENTS & COMPETITIONS (Galleries)
CREATE TABLE IF NOT EXISTS public.literacy_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  type TEXT NOT NULL CONSTRAINT chk_event_type CHECK (type IN ('lomba', 'kegiatan', 'sosialisasi')),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. STUDENT LITERACY ACHIEVEMENTS (Badges / Awards)
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  award_date DATE DEFAULT CURRENT_DATE NOT NULL,
  badge_icon TEXT, -- Name of Lucide icon to display (e.g. Award, BookOpen, Star)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS
ALTER TABLE public.literacy_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literacy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- Read policies: Logged-in users can read programs, events, and achievements
CREATE POLICY "Allow select for all on programs" ON public.literacy_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for all on events" ON public.literacy_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for all on achievements" ON public.student_achievements FOR SELECT TO authenticated USING (true);

-- Reading journals read: Student reads own, Teacher reads all for class monitoring
CREATE POLICY "Allow select reading journals own or staff" 
  ON public.reading_journals FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR public.is_library_staff() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru'
  ));

-- Write policies: Programs & Events managed by staff
CREATE POLICY "Allow write programs for staff" ON public.literacy_programs FOR ALL TO authenticated USING (public.is_library_staff());
CREATE POLICY "Allow write events for staff" ON public.literacy_events FOR ALL TO authenticated USING (public.is_library_staff());
CREATE POLICY "Allow write achievements for staff" ON public.student_achievements FOR ALL TO authenticated USING (public.is_library_staff());

-- Reading journals write: Student inserts/updates own, Teacher updates for verification
CREATE POLICY "Allow insert own reading journal" 
  ON public.reading_journals FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow update own reading journal draft" 
  ON public.reading_journals FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru'
  ))
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru'
  ));

-- ----------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reading_journals_user ON public.reading_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_journals_verified ON public.reading_journals(is_verified);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.literacy_events(event_date);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.student_achievements(user_id);

-- ----------------------------------------------------
-- AUTO UPDATE TIMESTAMPS
-- ----------------------------------------------------
CREATE TRIGGER on_literacy_programs_updated BEFORE UPDATE ON public.literacy_programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_reading_journals_updated BEFORE UPDATE ON public.reading_journals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
