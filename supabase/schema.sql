-- Database Schema for eLibrary
-- Indonesian School Library Management System

-- Create custom types or check constraints for roles
-- Roles: administrator, kepala_perpustakaan, petugas, guru, siswa

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'siswa' CONSTRAINT chk_role CHECK (role IN ('administrator', 'kepala_perpustakaan', 'petugas', 'guru', 'siswa')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable Profiles Policies
-- 1. Anyone logged in can read profiles
CREATE POLICY "Allow public read access to profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 2. Users can update their own profile details (full_name, avatar_url)
CREATE POLICY "Allow users to update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- 3. Administrators can do everything on profiles
CREATE POLICY "Allow admins full access to profiles" 
  ON public.profiles 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT := 'siswa';
  metadata_role TEXT;
BEGIN
  -- Extract role from metadata if present and valid
  metadata_role := NEW.raw_user_meta_data->>'role';
  IF metadata_role IS NOT NULL AND metadata_role IN ('administrator', 'kepala_perpustakaan', 'petugas', 'guru', 'siswa') THEN
    default_role := metadata_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, avatar_url, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role,
    NEW.raw_user_meta_data->>'avatar_url',
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------
-- STORAGE BUCKETS SETUP
-- ----------------------------------------------------
-- To be executed in Supabase SQL editor to create the avatars bucket and RLS policies

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects:
-- 1. Public read access to avatars
-- CREATE POLICY "Avatar Public Read" 
--   ON storage.objects FOR SELECT 
--   USING (bucket_id = 'avatars');

-- 2. Authenticated users can upload avatars to their own folder
-- CREATE POLICY "Avatar User Upload" 
--   ON storage.objects FOR INSERT 
--   TO authenticated 
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Authenticated users can update their own avatars
-- CREATE POLICY "Avatar User Update" 
--   ON storage.objects FOR UPDATE 
--   TO authenticated 
--   USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Authenticated users can delete their own avatars
-- CREATE POLICY "Avatar User Delete" 
--   ON storage.objects FOR DELETE 
--   TO authenticated 
--   USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
