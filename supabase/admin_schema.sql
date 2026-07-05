-- SQL Schema for eLibrary Administration & Accreditation Module
-- Includes Accreditation Documents and Version History tables

-- 1. ACCREDITATION DOCUMENTS
-- Categories: principal_decree (sk_kepsek), library_head_decree (sk_kapus), staff_assignment (tugas_staf),
--             vision (visi), mission (misi), annual_plan (rencana_tahunan), sop (sop), rules (peraturan),
--             organization_structure (struktur_org), library_layout (tata_letak), service_schedule (jadwal_layanan)

CREATE TABLE IF NOT EXISTS public.accreditation_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CONSTRAINT chk_doc_cat CHECK (category IN (
    'sk_kepsek', 'sk_kapus', 'tugas_staf', 'visi', 'misi', 
    'rencana_tahunan', 'sop', 'peraturan', 'struktur_org', 
    'tata_letak', 'jadwal_layanan'
  )),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  version INTEGER DEFAULT 1 NOT NULL CONSTRAINT chk_doc_version CHECK (version >= 1),
  status TEXT NOT NULL DEFAULT 'draft' CONSTRAINT chk_doc_status CHECK (status IN ('draft', 'review', 'disetujui', 'arsip')),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. DOCUMENT VERSION HISTORY (Many-to-One junction table)
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.accreditation_documents(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL CONSTRAINT chk_version_num CHECK (version >= 1),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS
ALTER TABLE public.accreditation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Read policies: Staff can view all, ordinary users (guru, siswa) can only view vision/mission/rules/layout/schedule (public documents)
CREATE POLICY "Allow public read access to public documents" 
  ON public.accreditation_documents FOR SELECT TO authenticated
  USING (category IN ('visi', 'misi', 'peraturan', 'tata_letak', 'jadwal_layanan') OR public.is_library_staff());

CREATE POLICY "Allow read version history for staff"
  ON public.document_versions FOR SELECT TO authenticated
  USING (public.is_library_staff());

-- Write policies: restricted to library staff only
CREATE POLICY "Allow all write actions for staff on documents" 
  ON public.accreditation_documents FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

CREATE POLICY "Allow all write actions for staff on versions" 
  ON public.document_versions FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- ----------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_accreditation_category ON public.accreditation_documents(category);
CREATE INDEX IF NOT EXISTS idx_accreditation_status ON public.accreditation_documents(status);
CREATE INDEX IF NOT EXISTS idx_accreditation_archived ON public.accreditation_documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);

-- ----------------------------------------------------
-- AUTO UPDATE TIMESTAMPS
-- ----------------------------------------------------
CREATE TRIGGER on_accreditation_documents_updated 
  BEFORE UPDATE ON public.accreditation_documents 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------
-- ACCREDITATION DOCUMENTS STORAGE BUCKET MIGRATION
-- ----------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- RLS policies for documents bucket:
-- CREATE POLICY "Documents Access restriction" 
--   ON storage.objects FOR ALL 
--   TO authenticated 
--   USING (bucket_id = 'documents' AND public.is_library_staff());
