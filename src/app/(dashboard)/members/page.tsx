import { Users, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Anggota"
        description="Kelola data keanggotaan perpustakaan untuk siswa, guru, dan petugas"
      >
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tambah Anggota
        </Button>
      </PageHeader>

      <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
        <CardHeader>
          <CardTitle>Keanggotaan eLibrary</CardTitle>
          <CardDescription>Cari, sunting, dan hapus keanggotaan pengguna perpustakaan</CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari berdasarkan nama, NIS/NIP, atau email..." className="pl-10" />
            </div>
            <Button variant="outline">Tipe Anggota</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 p-8 text-center text-muted-foreground bg-muted/10">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="font-medium text-foreground">Daftar anggota masih kosong</p>
            <p className="text-sm mt-1">Gunakan tombol &apos;Tambah Anggota&apos; untuk mulai mendaftarkan siswa atau guru.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
