import { createClient } from "@/lib/supabase/server";
import { getExecutiveStats } from "./actions";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Dashboard Eksekutif — eLibrary",
  description: "Sistem Manajemen Perpustakaan Sekolah Terintegrasi SNP",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch current user details
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .single();

  const stats = await getExecutiveStats();

  return (
    <DashboardClient
      initialStats={stats}
      profileName={profile?.full_name || "Pengguna"}
      profileRole={profile?.role || "siswa"}
    />
  );
}
