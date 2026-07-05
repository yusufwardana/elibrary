"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ReadingJournal, StudentAchievement, LiteracyEvent, LiteracyProgram, LiteracyStats } from "./types";

// Fetch reading journals list
export async function getReadingJournalsList(): Promise<ReadingJournal[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaffOrTeacher = 
    profile?.role === "administrator" || 
    profile?.role === "kepala_perpustakaan" || 
    profile?.role === "petugas" || 
    profile?.role === "guru";

  let query = supabase
    .from("reading_journals")
    .select(`
      *,
      profiles (id, full_name, role)
    `);

  if (!isStaffOrTeacher) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.order("read_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as ReadingJournal[];
}

// Fetch all reading achievements
export async function getAchievementsList(): Promise<StudentAchievement[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = 
    profile?.role === "administrator" || 
    profile?.role === "kepala_perpustakaan" || 
    profile?.role === "petugas";

  let query = supabase
    .from("student_achievements")
    .select(`
      *,
      profiles (id, full_name)
    `);

  if (!isStaff) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.order("award_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as StudentAchievement[];
}

// Fetch literacy programs
export async function getLiteracyProgramsList(): Promise<LiteracyProgram[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("literacy_programs")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch literacy events & competitions
export async function getLiteracyEventsList(): Promise<LiteracyEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("literacy_events")
    .select("*")
    .order("event_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch general stats
export async function getLiteracyStats(): Promise<LiteracyStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = 
    profile?.role === "administrator" || 
    profile?.role === "kepala_perpustakaan" || 
    profile?.role === "petugas" || 
    profile?.role === "guru";

  let query = supabase.from("reading_journals").select("pages_read, is_verified");
  let achievementQuery = supabase.from("student_achievements").select("id", { count: "exact" });

  if (!isStaff) {
    query = query.eq("user_id", user.id);
    achievementQuery = achievementQuery.eq("user_id", user.id);
  }

  const [journalsRes, achievementsRes] = await Promise.all([
    query,
    achievementQuery
  ]);

  const journals = journalsRes.data || [];
  const totalJournals = journals.length;
  const verifiedJournals = journals.filter(j => j.is_verified).length;
  const totalPagesRead = journals.reduce((acc, curr) => acc + (curr.pages_read || 0), 0);
  const totalAchievements = achievementsRes.count || 0;

  return {
    totalJournals,
    verifiedJournals,
    totalPagesRead,
    totalAchievements
  };
}

// Create a new reading journal log (student)
export async function createReadingJournalAction(
  bookTitle: string,
  author: string,
  summary: string,
  pagesRead: number
): Promise<ReadingJournal> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const { data, error } = await supabase
    .from("reading_journals")
    .insert([{
      user_id: user.id,
      book_title: bookTitle,
      author: author || null,
      summary,
      pages_read: pagesRead,
      is_verified: false
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/literacy");
  return data as ReadingJournal;
}

// Verify a reading journal log (teacher/staff)
export async function verifyReadingJournalAction(
  journalId: string,
  teacherNotes: string,
  approve: boolean
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const { error } = await supabase
    .from("reading_journals")
    .update({
      is_verified: approve,
      teacher_notes: teacherNotes || null,
      verified_by: user.id
    })
    .eq("id", journalId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/literacy");
  return { success: true };
}

// Create literacy event / competition
export async function createLiteracyEventAction(
  title: string,
  description: string,
  eventDate: string,
  type: "lomba" | "kegiatan" | "sosialisasi",
  photoUrl?: string
): Promise<LiteracyEvent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("literacy_events")
    .insert([{
      title,
      description: description || null,
      event_date: eventDate,
      type,
      photo_url: photoUrl || null
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/literacy");
  return data as LiteracyEvent;
}
