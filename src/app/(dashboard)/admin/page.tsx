import { PageHeader } from "@/components/shared/page-header";
import AdminClient from "./AdminClient";
import { getDocumentsList, getArchivedDocuments } from "./actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Administrasi & Akreditasi — eLibrary",
  description: "Kelola kelengkapan berkas SNP akreditasi perpustakaan sekolah",
};

export default async function AdminPage() {
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

  const [documents, archived] = await Promise.all([
    getDocumentsList(),
    getArchivedDocuments(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrasi & Akreditasi"
        description="Kelola instrumen kelengkapan SNP akreditasi dan berkas operasional perpustakaan sekolah"
      />

      <AdminClient
        initialDocuments={documents}
        initialArchived={archived}
        currentUserRole={userRole}
      />
    </div>
  );
}
