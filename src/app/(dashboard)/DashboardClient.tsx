"use client";

import { useState, useEffect, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ArrowLeftRight,
  CheckCircle,
  Users,
  Package,
  FileText,
  ClipboardList,
  Award,
  Download,
  Search,
  Bell,
  Activity,
  TrendingUp,
  Loader2,
  AlertCircle,
  BookMarked,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getExecutiveStats, executeGlobalSearch, ExecutiveStats, GlobalSearchResult } from "./actions";
import Link from "next/link";

interface DashboardClientProps {
  initialStats: ExecutiveStats;
  profileName: string;
  profileRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator Utama",
  kepala_perpustakaan: "Kepala Perpustakaan",
  petugas: "Petugas Perpustakaan",
  guru: "Guru Pembimbing",
  siswa: "Siswa Anggota",
};

export default function DashboardClient({ initialStats, profileName, profileRole }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();

  // Simulated notifications
  const [notifications, setNotifications] = useState<Array<{ id: string; msg: string; time: string }>>([
    { id: "1", msg: "Ahmad Fauzi meminjam 'Laskar Pelangi'", time: "Baru saja" },
    { id: "2", msg: "Siti Aminah mengembalikan 'Bumi Manusia'", time: "5 menit lalu" },
  ]);

  // Executive stats query
  const { data: stats } = useQuery<ExecutiveStats>({
    queryKey: ["executive-stats"],
    queryFn: getExecutiveStats,
    initialData: initialStats,
    refetchInterval: 15000, // Refresh stats every 15s for realtime emulation
  });

  // Emulate incoming notifications
  useEffect(() => {
    const alerts = [
      "Budi Utomo mengunggah SK Kepala Perpustakaan",
      "Rara Kirana menyelesaikan Jurnal Membaca Harian",
      "Petugas melakukan perbaikan AC Ruang Baca",
      "Siswa Baru terdaftar: Clara Shinta",
      "Peminjaman Terlambat: Matematika Kelas X",
    ];

    const timer = setInterval(() => {
      const idx = Math.floor(Math.random() * alerts.length);
      const newAlert = {
        id: Date.now().toString(),
        msg: alerts[idx],
        time: "Baru saja",
      };
      setNotifications((prev) => [newAlert, ...prev.slice(0, 4)]);
      toast.info(alerts[idx], {
        icon: <Bell className="h-4 w-4 text-indigo-500" />,
      });
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  // Global Search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    const delayDebounce = setTimeout(() => {
      startSearchTransition(async () => {
        try {
          const res = await executeGlobalSearch(searchQuery);
          setSearchResults(res);
        } catch {
          toast.error("Gagal melakukan pencarian global");
        }
      });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Exporters: CSV / Excel / PDF
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    if (format === "csv" || format === "excel") {
      const headers = ["Metrik Executive", "Nilai Kinerja", "Keterangan"];
      const rows = [
        ["Total Koleksi Buku", stats.booksCount, "Buku terdaftar di katalog"],
        ["Peminjaman Aktif", stats.borrowedCount, "Buku sedang dipinjam siswa/guru"],
        ["Buku Dikembalikan", stats.returnedCount, "Transaksi pengembalian selesai"],
        ["Total Pengunjung", stats.visitorsCount, "Estimasi kunjungan perpustakaan"],
        ["Inventaris Barang", stats.inventoryCount, "Aset fisik sarana prasarana"],
        ["Literasi Siswa", stats.literacyCount, "Jurnal membaca terverifikasi"],
        ["Dokumen Administrasi", stats.documentsCount, "Total dokumen SNP terunggah"],
        ["Skor Akreditasi", `${stats.accreditationRate}%`, "Kelengkapan standar akreditasi"],
      ];

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Executive_Report_eLibrary_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Laporan format ${format.toUpperCase()} berhasil diunduh`);
    } else {
      // PDF - print layout trigger
      window.print();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-6 text-white shadow-xl md:p-8 print:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(30,58,138,0.4),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(245,158,11,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              {getGreeting()}, {profileName}!
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Anda masuk sebagai <span className="font-semibold text-amber-400">{ROLE_LABELS[profileRole] || "Siswa"}</span>. Selamat datang di portal eksekutif eLibrary. Pantau kinerja standar nasional perpustakaan sekolah secara realtime.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 text-xs"
            >
              <Search className="h-4 w-4" />
              Cari Global (Ctrl+K)
            </Button>
            <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3 backdrop-blur-md border border-white/10">
              <Award className="h-5 w-5 text-amber-400" />
              <div className="text-xs text-left">
                <span className="block font-semibold">Sistem Eksekutif</span>
                <span className="text-[10px] text-slate-400">SNP Accreditation Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export & Action Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-500 animate-pulse" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Realtime data feeds updated
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Ekspor CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Ekspor Excel
          </Button>
          <Button onClick={() => handleExport("pdf")} size="sm" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Cetak PDF Laporan
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* 1. Books */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Koleksi Buku</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.booksCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Judul buku terdaftar</p>
          </CardContent>
        </Card>

        {/* 2. Borrowed */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Peminjaman</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.borrowedCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Buku sedang dipinjam</p>
          </CardContent>
        </Card>

        {/* 3. Returned */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Pengembalian</CardTitle>
            <CheckCircle className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.returnedCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Transaksi selesai</p>
          </CardContent>
        </Card>

        {/* 4. Visitors */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Pengunjung</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.visitorsCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Kunjungan terhitung</p>
          </CardContent>
        </Card>

        {/* 5. Inventory */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Aset Inventaris</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.inventoryCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sarana prasarana sekolah</p>
          </CardContent>
        </Card>

        {/* 6. Literacy */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Literasi GLS</CardTitle>
            <FileText className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.literacyCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Jurnal membaca terverifikasi</p>
          </CardContent>
        </Card>

        {/* 7. Documents */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Dokumen SNP</CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.documentsCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total berkas administrasi</p>
          </CardContent>
        </Card>

        {/* 8. Accreditation */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg hover:-translate-y-0.5 transition-all col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Akreditasi</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-extrabold">{stats.accreditationRate}%</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase">Lengkap</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden border">
              <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${stats.accreditationRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Activity Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Trend Monthly Activity Chart */}
        <Card className="md:col-span-2 border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Trafik Kunjungan & Sirkulasi Bulanan</CardTitle>
              <CardDescription>Visualisasi tren peminjaman buku dan kunjungan perpustakaan harian</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-48 flex items-end justify-between px-6 pt-4 pb-2">
            <div className="w-full h-full flex flex-col justify-between">
              <div className="flex-1 flex items-end justify-around gap-4 w-full pb-3 border-b border-border/50">
                {stats.monthlyActivity.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {/* Bar container with visitor count and borrow count */}
                    <div className="flex items-end gap-1">
                      {/* Borrows bar */}
                      <div
                        className="w-2.5 rounded-t bg-indigo-500 hover:opacity-90 transition-opacity"
                        style={{ height: `${(d.borrows / 700) * 120}px` }}
                        title={`Peminjaman: ${d.borrows}`}
                      />
                      {/* Visitors bar */}
                      <div
                        className="w-2.5 rounded-t bg-teal-500 hover:opacity-90 transition-opacity"
                        style={{ height: `${(d.visitors / 700) * 120}px` }}
                        title={`Pengunjung: ${d.visitors}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-around text-[10px] text-muted-foreground pt-1.5 font-semibold">
                {stats.monthlyActivity.map((d, i) => (
                  <span key={i}>{d.month}</span>
                ))}
              </div>
              <div className="flex justify-center gap-4 text-[9px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-indigo-500" /> Peminjaman
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-teal-500" /> Pengunjung
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Books Metric List */}
        <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Buku Populer Teratas</CardTitle>
            <CardDescription>Judul buku yang paling sering dipinjam</CardDescription>
          </CardHeader>
          <CardContent className="h-48 overflow-y-auto pr-1">
            <div className="space-y-3.5 text-xs">
              {stats.popularBooks.map((book, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="truncate max-w-[150px]">{book.title}</span>
                    <span className="text-indigo-500 font-bold">{book.count} Kali Dipinjam</span>
                  </div>
                  {/* Progress segment */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(book.count / 50) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Realtime Notification feed */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity Log */}
        <Card className="md:col-span-2 border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Log Aktivitas Terbaru</CardTitle>
            <CardDescription>Aktivitas transaksional eLibrary terintegrasi RLS</CardDescription>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto pr-1">
            <div className="space-y-3.5 text-xs">
              {stats.recentActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between border-b pb-2.5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px]">
                      {act.type.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{act.action}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Oleh: {act.user}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{act.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Event Notifications */}
        <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Umpan Notifikasi Sirkulasi</CardTitle>
            <CardDescription>Alert penyerahan tugas dan peminjaman terbaru</CardDescription>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto pr-1">
            <div className="space-y-3 text-[11px]">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-2.5 rounded-lg border bg-background/50 flex items-start gap-2.5">
                  <Bell className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground leading-normal">{notif.msg}</p>
                    <span className="text-[9px] text-muted-foreground font-mono block mt-1">{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Search Dialog Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg p-0 border border-border/50 shadow-2xl overflow-hidden text-xs">
          <DialogHeader className="p-4 bg-muted/40 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari buku, anggota, atau dokumen SNP di perpustakaan..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim().length < 2) {
                    setSearchResults(null);
                  }
                }}
                className="pl-10 pr-8 h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm"
                autoFocus
              />
              {isSearching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto p-4 space-y-4">
            {searchResults ? (
              <>
                {/* 1. Books results */}
                {searchResults.books.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-indigo-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <BookMarked className="h-3.5 w-3.5" /> Koleksi Buku ({searchResults.books.length})
                    </h4>
                    <div className="divide-y rounded-lg border bg-background/50">
                      {searchResults.books.map((b) => (
                        <Link
                          key={b.id}
                          href="/dashboard/books"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="font-semibold">{b.title}</div>
                          <span className="text-[9px] text-muted-foreground font-mono">ISBN: {b.isbn}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Profiles results */}
                {searchResults.profiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-emerald-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Anggota / Staff ({searchResults.profiles.length})
                    </h4>
                    <div className="divide-y rounded-lg border bg-background/50">
                      {searchResults.profiles.map((p) => (
                        <Link
                          key={p.id}
                          href="/dashboard/profile"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="font-semibold">{p.full_name}</div>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">{ROLE_LABELS[p.role]}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Documents results */}
                {searchResults.documents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-purple-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <FileCheck className="h-3.5 w-3.5" /> Berkas Administrasi ({searchResults.documents.length})
                    </h4>
                    <div className="divide-y rounded-lg border bg-background/50">
                      {searchResults.documents.map((d) => (
                        <Link
                          key={d.id}
                          href="/dashboard/admin"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="font-semibold">{d.name}</div>
                          <span className="text-[9px] text-muted-foreground capitalize">{d.category.replace("_", " ")}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.books.length === 0 &&
                  searchResults.profiles.length === 0 &&
                  searchResults.documents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <span>Tidak menemukan hasil yang cocok untuk &ldquo;{searchQuery}&rdquo;</span>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <span>Ketik setidaknya 2 karakter untuk memulai penelusuran</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
