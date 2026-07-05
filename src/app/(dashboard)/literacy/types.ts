export interface ReadingJournal {
  id: string;
  user_id: string;
  book_title: string;
  author: string | null;
  summary: string;
  pages_read: number;
  read_date: string;
  teacher_notes: string | null;
  is_verified: boolean;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export interface LiteracyProgram {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: "aktif" | "selesai";
  created_at: string;
  updated_at: string;
}

export interface LiteracyEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  type: "lomba" | "kegiatan" | "sosialisasi";
  photo_url: string | null;
  created_at: string;
}

export interface StudentAchievement {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  award_date: string;
  badge_icon: string | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}

export interface LiteracyStats {
  totalJournals: number;
  verifiedJournals: number;
  totalPagesRead: number;
  totalAchievements: number;
}
