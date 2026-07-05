-- SQL Schema for eLibrary Inventory Management Module
-- Includes Inventory Assets, Maintenance Logs, Damage Reports, and Repair History tables

-- 1. INVENTORY ASSETS
-- Categories: bookshelves (rak_buku), tables (meja), chairs (kursi), computers (komputer),
--             printers (printer), network (jaringan), air_conditioner (ac), projector (proyektor), scanner (scanner)

CREATE TABLE IF NOT EXISTS public.inventory_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CONSTRAINT chk_asset_cat CHECK (category IN (
    'rak_buku', 'meja', 'kursi', 'komputer', 'printer', 'jaringan', 'ac', 'proyektor', 'scanner'
  )),
  asset_code TEXT UNIQUE NOT NULL,
  condition TEXT NOT NULL DEFAULT 'baik' CONSTRAINT chk_asset_cond CHECK (condition IN ('baik', 'rusak_ringan', 'rusak_berat')),
  location TEXT,
  photo_url TEXT,
  purchase_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ASSET MAINTENANCE LOGS
CREATE TABLE IF NOT EXISTS public.asset_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.inventory_assets(id) ON DELETE CASCADE NOT NULL,
  maintenance_date DATE NOT NULL,
  details TEXT NOT NULL,
  performed_by TEXT,
  cost NUMERIC DEFAULT 0 NOT NULL CONSTRAINT chk_maint_cost CHECK (cost >= 0),
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. ASSET DAMAGE REPORTS
CREATE TABLE IF NOT EXISTS public.asset_damage_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.inventory_assets(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_date DATE DEFAULT CURRENT_DATE NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'dilaporkan' CONSTRAINT chk_dmg_status CHECK (status IN ('dilaporkan', 'perbaikan', 'selesai', 'dibuang')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. ASSET REPAIR HISTORY
CREATE TABLE IF NOT EXISTS public.asset_repair_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  damage_report_id UUID REFERENCES public.asset_damage_reports(id) ON DELETE CASCADE NOT NULL,
  repair_date DATE NOT NULL,
  repair_details TEXT NOT NULL,
  cost NUMERIC DEFAULT 0 NOT NULL CONSTRAINT chk_repair_cost CHECK (cost >= 0),
  repaired_by TEXT,
  status TEXT NOT NULL DEFAULT 'proses' CONSTRAINT chk_repair_status CHECK (status IN ('proses', 'selesai')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS
ALTER TABLE public.inventory_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_repair_history ENABLE ROW LEVEL SECURITY;

-- Read policies: Logged-in users can read assets
CREATE POLICY "Allow read for all authenticated users on assets" 
  ON public.inventory_assets FOR SELECT TO authenticated USING (true);

-- Maintenance & damage read: Staff can read all
CREATE POLICY "Allow read for staff on maintenance"
  ON public.asset_maintenance FOR SELECT TO authenticated USING (public.is_library_staff());

CREATE POLICY "Allow read for staff on damage reports"
  ON public.asset_damage_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for staff on repairs"
  ON public.asset_repair_history FOR SELECT TO authenticated USING (public.is_library_staff());

-- Write policies: restricted to library staff only
CREATE POLICY "Allow write actions for staff on assets" 
  ON public.inventory_assets FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

CREATE POLICY "Allow write actions for staff on maintenance" 
  ON public.asset_maintenance FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Damage reports write: Users can insert, staff can manage all
CREATE POLICY "Allow insert damage report" 
  ON public.asset_damage_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Allow update for staff on damage reports" 
  ON public.asset_damage_reports FOR UPDATE TO authenticated
  USING (public.is_library_staff() OR auth.uid() = reported_by)
  WITH CHECK (public.is_library_staff() OR auth.uid() = reported_by);

CREATE POLICY "Allow write actions for staff on repairs" 
  ON public.asset_repair_history FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- ----------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_asset_category ON public.inventory_assets(category);
CREATE INDEX IF NOT EXISTS idx_asset_condition ON public.inventory_assets(condition);
CREATE INDEX IF NOT EXISTS idx_asset_code ON public.inventory_assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset_id ON public.asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_asset_id ON public.asset_damage_reports(asset_id);
CREATE INDEX IF NOT EXISTS idx_repairs_report_id ON public.asset_repair_history(damage_report_id);

-- ----------------------------------------------------
-- AUTO UPDATE TIMESTAMPS
-- ----------------------------------------------------
CREATE TRIGGER on_inventory_assets_updated BEFORE UPDATE ON public.inventory_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_asset_damage_reports_updated BEFORE UPDATE ON public.asset_damage_reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
