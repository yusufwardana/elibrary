import { Settings, Save, Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi preferensi perpustakaan sekolah, batas peminjaman, dan denda sanksi"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Kebijakan Sirkulasi
            </CardTitle>
            <CardDescription>Atur batas waktu peminjaman dan besaran denda keterlambatan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="max-books-siswa">Maks. Peminjaman Buku (Siswa)</Label>
              <Input id="max-books-siswa" type="number" defaultValue={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max-books-guru">Maks. Peminjaman Buku (Guru)</Label>
              <Input id="max-books-guru" type="number" defaultValue={5} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loan-duration">Durasi Peminjaman (Hari)</Label>
              <Input id="loan-duration" type="number" defaultValue={7} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fine-rate">Tarif Denda per Hari (Rupiah)</Label>
              <Input id="fine-rate" type="number" defaultValue={1000} />
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-4 flex justify-end">
            <Button className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Simpan Kebijakan
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Identitas Sekolah
            </CardTitle>
            <CardDescription>Sesuaikan nama sekolah dan informasi kontak yang tampil pada slip perpustakaan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="school-name">Nama Sekolah</Label>
              <Input id="school-name" type="text" defaultValue="SMA Negeri 1 eLibrary" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="library-head">Nama Kepala Perpustakaan</Label>
              <Input id="library-head" type="text" defaultValue="Drs. H. Pustakawan, M.Pd" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="library-address">Alamat Perpustakaan</Label>
              <Input id="library-address" type="text" defaultValue="Jl. Pendidikan No. 123, Kota eLibrary" />
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-4 flex justify-end">
            <Button className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Simpan Identitas
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
