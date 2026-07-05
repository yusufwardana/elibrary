"use server";

import { createClient } from "@/lib/supabase/server";

export interface ExecutiveStats {
  booksCount: number;
  borrowedCount: number;
  returnedCount: number;
  visitorsCount: number;
  inventoryCount: number;
  literacyCount: number;
  documentsCount: number;
  accreditationRate: number;
  popularBooks: Array<{ title: string; count: number }>;
  monthlyActivity: Array<{ month: string; borrows: number; visitors: number }>;
  recentActivities: Array<{ id: string; user: string; action: string; time: string; type: string }>;
}

export async function getExecutiveStats(): Promise<ExecutiveStats> {
  const supabase = await createClient();

  // Prefetch data in parallel
  const [
    booksRes,
    borrowedRes,
    returnedRes,
    profilesRes,
    inventoryRes,
    literacyRes,
    docsRes,
    approvedDocsRes,
  ] = await Promise.all([
    supabase.from("books").select("id", { count: "exact", head: true }),
    supabase.from("borrowings").select("id", { count: "exact" }).eq("status", "dipinjam"),
    supabase.from("borrowings").select("id", { count: "exact" }).eq("status", "kembali"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("inventory_assets").select("id", { count: "exact", head: true }),
    supabase.from("reading_journals").select("id", { count: "exact" }).eq("is_verified", true),
    supabase.from("accreditation_documents").select("id", { count: "exact", head: true }),
    supabase.from("accreditation_documents").select("id", { count: "exact" }).eq("status", "disetujui"),
  ]);

  const booksCount = booksRes.count || 0;
  const borrowedCount = borrowedRes.count || 0;
  const returnedCount = returnedRes.count || 0;
  const visitorsCount = (profilesRes.count || 0) * 4; // Mocked simulation multiplier for visits
  const inventoryCount = inventoryRes.count || 0;
  const literacyCount = literacyRes.count || 0;
  const documentsCount = docsRes.count || 0;

  // Accreditation percentage: approved documents / total documents
  const approvedDocsCount = approvedDocsRes.count || 0;
  const accreditationRate = documentsCount > 0 ? Math.round((approvedDocsCount / documentsCount) * 100) : 0;

  // Mocking high-fidelity popular books and monthly trend data
  const popularBooks = [
    { title: "Laskar Pelangi", count: 48 },
    { title: "Bumi Manusia", count: 36 },
    { title: "Negeri 5 Menara", count: 29 },
    { title: "Ronggeng Dukuh Paruk", count: 22 },
    { title: "Pulang - Leila S. Chudori", count: 18 },
  ];

  const monthlyActivity = [
    { month: "Feb", borrows: 95, visitors: 310 },
    { month: "Mar", borrows: 120, visitors: 420 },
    { month: "Apr", borrows: 155, visitors: 580 },
    { month: "May", borrows: 142, visitors: 510 },
    { month: "Jun", borrows: 180, visitors: 690 },
  ];

  const recentActivities = [
    { id: "1", user: "Ahmad Fauzi", action: "Meminjam buku 'Laskar Pelangi'", time: "10 menit yang lalu", type: "borrow" },
    { id: "2", user: "Siti Aminah", action: "Mengembalikan buku 'Bumi Manusia'", time: "30 menit yang lalu", type: "return" },
    { id: "3", user: "Budi Utomo", action: "Mengunggah dokumen akreditasi 'SK Kepala Perpustakaan'", time: "1 jam yang lalu", type: "document" },
    { id: "4", user: "Rara Kirana", action: "Mengirim jurnal membaca harian", time: "2 jam yang lalu", type: "literacy" },
    { id: "5", user: "Admin", action: "Melakukan pemeliharaan server inventaris", time: "4 jam yang lalu", type: "inventory" },
  ];

  return {
    booksCount,
    borrowedCount,
    returnedCount,
    visitorsCount,
    inventoryCount,
    literacyCount,
    documentsCount,
    accreditationRate,
    popularBooks,
    monthlyActivity,
    recentActivities,
  };
}

// Global search action across books, members (profiles), and documents
export interface GlobalSearchResult {
  books: Array<{ id: string; title: string; isbn: string }>;
  profiles: Array<{ id: string; full_name: string; role: string }>;
  documents: Array<{ id: string; name: string; category: string }>;
}

export async function executeGlobalSearch(query: string): Promise<GlobalSearchResult> {
  if (!query || query.trim().length < 2) {
    return { books: [], profiles: [], documents: [] };
  }

  const supabase = await createClient();

  const [booksRes, profilesRes, docsRes] = await Promise.all([
    supabase.from("books").select("id, title, isbn").ilike("title", `%${query}%`).limit(5),
    supabase.from("profiles").select("id, full_name, role").ilike("full_name", `%${query}%`).limit(5),
    supabase.from("accreditation_documents").select("id, name, category").ilike("name", `%${query}%`).limit(5),
  ]);

  return {
    books: booksRes.data || [],
    profiles: profilesRes.data || [],
    documents: docsRes.data || [],
  };
}
