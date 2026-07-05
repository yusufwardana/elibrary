import { PageHeader } from "@/components/shared/page-header";
import LiteracyClient from "./LiteracyClient";
import {
  getReadingJournalsList,
  getAchievementsList,
  getLiteracyProgramsList,
  getLiteracyEventsList,
  getLiteracyStats,
} from "./actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Gerakan Literasi Sekolah (GLS) — eLibrary",
  description: "Kelola kegiatan membaca mandiri siswa dan program literasi SNP",
};

export default async function LiteracyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = "siswa";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) {
      userRole = profile.role;
    }
  }

  const [journals, achievements, programs, events, stats] = await Promise.all([
    getReadingJournalsList(),
    getAchievementsList(),
    getLiteracyProgramsList(),
    getLiteracyEventsList(),
    getLiteracyStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerakan Literasi Sekolah"
        description="Pantau kegiatan membaca mandiri siswa, jurnal harian, agenda kompetisi, dan program literasi sekolah (GLS)"
      />

      <LiteracyClient
        initialJournals={journals}
        initialAchievements={achievements}
        initialPrograms={programs}
        initialEvents={events}
        initialStats={stats}
        currentUserRole={userRole}
      />
    </div>
  );
}
