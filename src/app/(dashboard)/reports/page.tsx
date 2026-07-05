import { BarChart3, Download, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Perpustakaan"
        description="Analisis aktivitas sirkulasi buku, statistik keanggotaan, dan denda sanksi"
      >
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Pilih Periode
        </Button>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Ekspor Laporan (PDF/Excel)
        </Button>
      </PageHeader>

      <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
        <CardHeader>
          <CardTitle>Analisis & Statistik</CardTitle>
          <CardDescription>Visualisasi aktivitas perpustakaan dalam bentuk grafik dan tabel data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 p-8 text-center text-muted-foreground bg-muted/10">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="font-medium text-foreground">Laporan belum tersedia</p>
            <p className="text-sm mt-1">Data statistik akan muncul setelah terdapat transaksi sirkulasi buku yang tercatat di sistem.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
