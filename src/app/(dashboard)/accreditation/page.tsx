import { PageHeader } from "@/components/shared/page-header";
import AccreditationClient from "./AccreditationClient";
import { getAccreditationOverview } from "./actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Akreditasi Standar Nasional Perpustakaan (SNP) — eLibrary",
  description: "Kelola pemenuhan 8 standar nasional akreditasi perpustakaan sekolah secara efisien",
};

export default async function AccreditationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = "siswa";
  let userName = "Pengguna";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      userRole = profile.role;
      userName = profile.full_name;
    }
  }

  const overview = await getAccreditationOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Akreditasi Perpustakaan (SNP)"
        description="Persiapkan akreditasi perpustakaan sekolah Anda secara terstruktur menggunakan 8 Kategori Standar Nasional Perpustakaan"
      />

      <AccreditationClient
        initialOverview={overview}
        currentUserRole={userRole}
        profileName={userName}
        profileRole={userRole}
      />
    </div>
  );
}
