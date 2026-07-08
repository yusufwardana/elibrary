-- ============================================================
-- SEED DUMMY USERS — eLibrary
-- ============================================================
-- Jalankan script ini di Supabase SQL Editor (https://supabase.com/dashboard)
-- Script ini akan membuat user di auth.users dan trigger on_auth_user_created
-- akan otomatis membuat record di tabel public.profiles.
--
-- Password semua user: Password123!
-- ============================================================

-- Helper: Hashed password untuk 'Password123!'
-- Supabase menggunakan bcrypt. Hash ini dihasilkan dari 'Password123!'
-- Jika ingin password berbeda, generate hash bcrypt baru.

DO $$
DECLARE
  hashed_pw TEXT := crypt('Password123!', gen_salt('bf'));
BEGIN

  -- =====================================================
  -- 1. ADMINISTRATOR
  -- =====================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Budi Santoso', 'role', 'administrator'),
    NOW(),
    NOW(),
    '',
    ''
  );

  -- =====================================================
  -- 2. KEPALA PERPUSTAKAAN
  -- =====================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kepala@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Siti Rahmawati', 'role', 'kepala_perpustakaan'),
    NOW(),
    NOW(),
    '',
    ''
  );

  -- =====================================================
  -- 3. PETUGAS PERPUSTAKAAN (2 orang)
  -- =====================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'petugas1@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Ahmad Fauzi', 'role', 'petugas'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'petugas2@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Dewi Lestari', 'role', 'petugas'),
    NOW(),
    NOW(),
    '',
    ''
  );

  -- =====================================================
  -- 4. GURU (3 orang)
  -- =====================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'guru1@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Hendra Wijaya', 'role', 'guru'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'guru2@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Ratna Kusuma', 'role', 'guru'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'guru3@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Indra Permana', 'role', 'guru'),
    NOW(),
    NOW(),
    '',
    ''
  );

  -- =====================================================
  -- 5. SISWA (5 orang)
  -- =====================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'siswa1@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Andi Prasetyo', 'role', 'siswa'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'siswa2@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Putri Ayu Ningrum', 'role', 'siswa'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'siswa3@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Rizky Maulana', 'role', 'siswa'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'siswa4@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Farah Dina', 'role', 'siswa'),
    NOW(),
    NOW(),
    '',
    ''
  );

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'siswa5@elibrary.test',
    hashed_pw,
    NOW(),
    jsonb_build_object('full_name', 'Muhammad Iqbal', 'role', 'siswa'),
    NOW(),
    NOW(),
    '',
    ''
  );

END $$;

-- ============================================================
-- VERIFIKASI
-- ============================================================
-- Cek user yang baru dibuat di auth.users
SELECT id, email, raw_user_meta_data->>'full_name' AS full_name, raw_user_meta_data->>'role' AS role
FROM auth.users
WHERE email LIKE '%@elibrary.test'
ORDER BY raw_user_meta_data->>'role', email;

-- Cek profiles yang otomatis terbuat oleh trigger
SELECT id, email, full_name, role, is_active
FROM public.profiles
WHERE email LIKE '%@elibrary.test'
ORDER BY role, email;
