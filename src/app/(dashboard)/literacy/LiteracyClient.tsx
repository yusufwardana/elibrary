"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  Award,
  Trophy,
  Star,
  Flame,
  Calendar,
  Download,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getReadingJournalsList,
  getAchievementsList,
  getLiteracyProgramsList,
  getLiteracyEventsList,
  getLiteracyStats,
  createReadingJournalAction,
  verifyReadingJournalAction,
  createLiteracyEventAction,
} from "./actions";
import { ReadingJournal, StudentAchievement, LiteracyEvent, LiteracyProgram, LiteracyStats } from "./types";

interface LiteracyClientProps {
  initialJournals: ReadingJournal[];
  initialAchievements: StudentAchievement[];
  initialPrograms: LiteracyProgram[];
  initialEvents: LiteracyEvent[];
  initialStats: LiteracyStats;
  currentUserRole: string;
}

// Icon mapper for achievements
const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Award: Award,
  Trophy: Trophy,
  Star: Star,
  Flame: Flame,
  BookOpen: BookOpen,
  Heart: Heart,
};

export default function LiteracyClient({
  initialJournals,
  initialAchievements,
  initialPrograms,
  initialEvents,
  initialStats,
  currentUserRole,
}: LiteracyClientProps) {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isTeacherOrStaff =
    currentUserRole === "administrator" ||
    currentUserRole === "kepala_perpustakaan" ||
    currentUserRole === "petugas" ||
    currentUserRole === "guru";

  // Sheets & Dialogs State
  const [logOpen, setLogOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Focus item selections
  const [selectedJournal, setSelectedJournal] = useState<ReadingJournal | null>(null);

  // Verification Form State
  const [teacherNotes, setTeacherNotes] = useState("");
  const [verifyApprove, setVerifyApprove] = useState(true);

  // Log Daily Reading Form States
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [summary, setSummary] = useState("");
  const [pagesRead, setPagesRead] = useState(5);

  // Create Event Form States
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [eventType, setEventType] = useState<"lomba" | "kegiatan" | "sosialisasi">("kegiatan");
  const [eventPhoto, setEventPhoto] = useState("");

  // Queries
  const { data: journals } = useQuery<ReadingJournal[]>({
    queryKey: ["reading-journals"],
    queryFn: getReadingJournalsList,
    initialData: initialJournals,
  });

  const { data: achievements } = useQuery<StudentAchievement[]>({
    queryKey: ["literacy-achievements"],
    queryFn: getAchievementsList,
    initialData: initialAchievements,
  });

  const { data: programs } = useQuery<LiteracyProgram[]>({
    queryKey: ["literacy-programs"],
    queryFn: getLiteracyProgramsList,
    initialData: initialPrograms,
  });

  const { data: events } = useQuery<LiteracyEvent[]>({
    queryKey: ["literacy-events"],
    queryFn: getLiteracyEventsList,
    initialData: initialEvents,
  });

  const { data: stats } = useQuery<LiteracyStats>({
    queryKey: ["literacy-stats"],
    queryFn: getLiteracyStats,
    initialData: initialStats,
  });

  // Mutations
  const createJournalMutation = useMutation({
    mutationFn: () => createReadingJournalAction(bookTitle, bookAuthor, summary, pagesRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-journals"] });
      queryClient.invalidateQueries({ queryKey: ["literacy-stats"] });
      setLogOpen(false);
      setBookTitle("");
      setBookAuthor("");
      setSummary("");
      setPagesRead(5);
      toast.success("Jurnal membaca harian berhasil dicatat");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mencatat jurnal");
    },
  });

  const verifyJournalMutation = useMutation({
    mutationFn: () => verifyReadingJournalAction(selectedJournal?.id || "", teacherNotes, verifyApprove),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-journals"] });
      queryClient.invalidateQueries({ queryKey: ["literacy-stats"] });
      setVerifyOpen(false);
      setTeacherNotes("");
      toast.success("Jurnal membaca berhasil dikonfirmasi");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal melakukan verifikasi");
    },
  });

  const createEventMutation = useMutation({
    mutationFn: () => createLiteracyEventAction(eventTitle, eventDesc, eventDate, eventType, eventPhoto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["literacy-events"] });
      setEventOpen(false);
      setEventTitle("");
      setEventDesc("");
      setEventPhoto("");
      toast.success("Kegiatan literasi berhasil didaftarkan");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal membuat kegiatan");
    },
  });

  // Filters logic
  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "aktif" && !j.is_verified) ||
        (statusFilter === "verified" && j.is_verified);
      return matchStatus;
    });
  }, [journals, statusFilter]);

  const handleOpenVerify = useCallback((journal: ReadingJournal) => {
    setSelectedJournal(journal);
    setTeacherNotes(journal.teacher_notes || "");
    setVerifyApprove(true);
    setVerifyOpen(true);
  }, []);

  const handleOpenDetail = useCallback((journal: ReadingJournal) => {
    setSelectedJournal(journal);
    setDetailOpen(true);
  }, []);

  // Columns definition
  const columns = useMemo<ColumnDef<ReadingJournal>[]>(
    () => [
      {
        accessorKey: "read_date",
        header: "Tgl Baca",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.read_date}</span>,
      },
      ...(isTeacherOrStaff
        ? [
            {
              accessorKey: "profiles.full_name",
              header: "Siswa",
              cell: ({ row }: { row: { original: ReadingJournal } }) => (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] border">
                    {row.original.profiles?.full_name?.charAt(0) || "S"}
                  </div>
                  <span className="font-semibold text-xs text-foreground">{row.original.profiles?.full_name || "Siswa"}</span>
                </div>
              ),
            },
          ]
        : []),
      {
        accessorKey: "book_title",
        header: "Buku & Summary",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold truncate text-sm text-foreground">{row.original.book_title}</span>
            <span className="text-[10px] text-muted-foreground truncate italic">
              {row.original.summary.slice(0, 50)}...
            </span>
          </div>
        ),
      },
      {
        accessorKey: "pages_read",
        header: "Jlh Hal",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.pages_read} hlm</span>,
      },
      {
        accessorKey: "is_verified",
        header: "Status",
        cell: ({ row }) => {
          const isV = row.original.is_verified;
          return (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
              isV 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            }`}>
              {isV ? "Terverifikasi" : "Draft / Pending"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="ghost" onClick={() => handleOpenDetail(row.original)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4" />
            </Button>
            {isTeacherOrStaff && !row.original.is_verified && (
              <Button size="sm" variant="outline" onClick={() => handleOpenVerify(row.original)} className="h-7 text-[10px]">
                Review
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleOpenDetail, handleOpenVerify, isTeacherOrStaff]
  );

  const table = useReactTable({
    data: filteredJournals,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  // Export report
  const handleExportCSV = () => {
    const headers = ["Tanggal", "Nama Siswa", "Judul Buku", "Penulis", "Halaman", "Sinopsis / Rangkuman", "Verified"];
    const rows = filteredJournals.map((j) => [
      j.read_date,
      `"${j.profiles?.full_name || "N/A"}"`,
      `"${j.book_title.replace(/"/g, '""')}"`,
      `"${(j.author || "").replace(/"/g, '""')}"`,
      j.pages_read,
      `"${j.summary.replace(/"/g, '""')}"`,
      j.is_verified ? "Ya" : "Tidak",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Jurnal_Membaca_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Jurnal membaca berhasil diekspor");
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Jurnal Membaca</CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalJournals || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total ringkasan dicatat</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Terverifikasi Guru</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.verifiedJournals || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Laporan valid SNP</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Halaman Dibaca</CardTitle>
            <Flame className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {(stats.totalPagesRead || 0).toLocaleString()} hlm
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total akumulasi halaman</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Penghargaan Literasi</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalAchievements || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Badge / Duta terdaftar</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts and Program Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Weekly Reading Progress SVG Chart */}
        <Card className="md:col-span-2 border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Progress Membaca Mingguan</CardTitle>
            <CardDescription>Grafik jumlah halaman buku yang dibaca 5 minggu terakhir</CardDescription>
          </CardHeader>
          <CardContent className="h-44 flex items-end justify-between px-6 pt-4 pb-2">
            <div className="w-full h-full flex flex-col justify-between">
              <div className="flex-1 flex items-end justify-around gap-2 w-full pb-3 border-b border-border/50">
                {/* Week 1 */}
                <div className="flex flex-col items-center w-10">
                  <div className="w-6 rounded-t bg-indigo-500" style={{ height: "35px" }} title="120 Hlm" />
                </div>
                {/* Week 2 */}
                <div className="flex flex-col items-center w-10">
                  <div className="w-6 rounded-t bg-indigo-500" style={{ height: "55px" }} title="190 Hlm" />
                </div>
                {/* Week 3 */}
                <div className="flex flex-col items-center w-10">
                  <div className="w-6 rounded-t bg-indigo-500" style={{ height: "80px" }} title="280 Hlm" />
                </div>
                {/* Week 4 */}
                <div className="flex flex-col items-center w-10">
                  <div className="w-6 rounded-t bg-indigo-500" style={{ height: "65px" }} title="220 Hlm" />
                </div>
                {/* Week 5 */}
                <div className="flex flex-col items-center w-10">
                  <div className="w-6 rounded-t bg-indigo-500" style={{ height: "95px" }} title="340 Hlm" />
                </div>
              </div>
              <div className="flex justify-around text-[10px] text-muted-foreground pt-1.5 font-medium">
                <span>Minggu 1</span>
                <span>Minggu 2</span>
                <span>Minggu 3</span>
                <span>Minggu 4</span>
                <span>Minggu 5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reading Achievement Badges */}
        <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Badge Pencapaian</CardTitle>
            <CardDescription>Penghargaan gerakan literasi sekolah</CardDescription>
          </CardHeader>
          <CardContent className="h-44 overflow-y-auto pr-1">
            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((ach) => {
                  const Icon = BADGE_ICONS[ach.badge_icon || "Award"] || Award;
                  return (
                    <div
                      key={ach.id}
                      className="flex flex-col items-center text-center p-2 rounded-lg bg-background/50 border border-border/40 space-y-1"
                    >
                      <div className="h-8 w-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-[10px] text-foreground truncate max-w-full leading-normal">
                        {ach.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs pb-4">
                <Trophy className="h-8 w-8 text-muted-foreground/30 mb-1.5" />
                <span>Belum ada badge terbit. Terus membaca!</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. GLS Active Programs Grid */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Program GLS Aktif</CardTitle>
          <CardDescription>Program Gerakan Literasi Sekolah SNP wajib untuk meningkatkan minat baca siswa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((prog) => (
              <div
                key={prog.id}
                className="p-3.5 border rounded-lg bg-background/50 space-y-2 hover:border-indigo-500/20 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-foreground">{prog.name}</h4>
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold border capitalize bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {prog.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    &ldquo;{prog.description}&rdquo;
                  </p>
                </div>
                <div className="border-t pt-2 mt-2 flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                  <span>Mulai: {prog.start_date}</span>
                  {prog.end_date && <span>Selesai: {prog.end_date}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Reading Journals Table Log */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Log Jurnal Membaca Harian</CardTitle>
            <CardDescription>Review ringkasan summary buku sirkulasi SNP dan monitoring keterbacaan</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              Ekspor CSV
            </Button>
            {!isTeacherOrStaff && (
              <Button onClick={() => setLogOpen(true)} size="sm" className="gap-2 text-xs">
                <Plus className="h-4 w-4" />
                Catat Jurnal Harian
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls: Search & Dropdown Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan judul buku atau rangkuman..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jurnal</SelectItem>
                <SelectItem value="aktif">Draft / Pending</SelectItem>
                <SelectItem value="verified">Terverifikasi Guru</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border/50 overflow-hidden bg-background/50">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-semibold text-left">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border/50">
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 font-medium align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground bg-muted/5">
                      <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="font-semibold text-foreground">Tidak ada jurnal membaca</p>
                      <p className="text-xs mt-1">Gunakan formulir untuk mulai mencatat ringkasan buku hari ini.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-muted-foreground">
              Menampilkan {table.getRowModel().rows.length} dari {filteredJournals.length} baris jurnal
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 text-[11px]"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 text-[11px]"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Competitions and Event Documentation Gallery Grid */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Galeri & Agenda Literasi</CardTitle>
            <CardDescription>Dokumentasi lomba resensi, sosialisasi GLS, dan kegiatan literasi sekolah</CardDescription>
          </div>
          {isTeacherOrStaff && (
            <Button onClick={() => setEventOpen(true)} size="sm" className="gap-2 text-xs">
              <Plus className="h-4 w-4" />
              Tambah Agenda Lomba
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="group border border-border/50 rounded-lg overflow-hidden bg-background/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                {ev.photo_url && (
                  <div className="h-32 w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.photo_url} alt={ev.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                )}
                <div className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground text-sm truncate max-w-[200px]">{ev.title}</span>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold border capitalize ${
                      ev.type === "lomba" 
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/20" 
                        : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                    }`}>
                      {ev.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">{ev.description}</p>
                </div>
                <div className="border-t p-2.5 flex items-center gap-1 text-[9px] text-muted-foreground font-mono bg-muted/20">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Pelaksanaan: {ev.event_date}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6. Sheet: Create Daily Journal Form */}
      <Sheet open={logOpen} onOpenChange={setLogOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Log Jurnal Harian</SheetTitle>
            <SheetDescription>Kumpulkan ringkasan buku hasil membaca mandiri hari ini.</SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createJournalMutation.mutate();
            }}
            className="space-y-4 pt-5"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="bTitle">Judul Buku</Label>
              <Input id="bTitle" placeholder="e.g. Harry Potter & Batu Bertuah" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="bAuth">Nama Pengarang (Author)</Label>
              <Input id="bAuth" placeholder="e.g. J.K. Rowling" value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="bPages">Halaman Dibaca Hari Ini</Label>
              <Input id="bPages" type="number" min={1} value={pagesRead} onChange={(e) => setPagesRead(parseInt(e.target.value) || 1)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="bSummary">Sinopsis / Ringkasan Membaca</Label>
              <textarea
                id="bSummary"
                placeholder="Rangkum gagasan utama, alur cerita, atau hal menarik yang dipelajari..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-28 w-full rounded border p-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-6">
              <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createJournalMutation.isPending || !bookTitle || !summary}>
                {createJournalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Jurnal
              </Button>
            </DialogFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* 7. Dialog: Teacher Review Verification */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Verifikasi Jurnal Membaca Siswa</DialogTitle>
            <DialogDescription>Beri catatan umpan balik review untuk klaim kemajuan literasi SNP.</DialogDescription>
          </DialogHeader>

          {selectedJournal && (
            <div className="space-y-4 py-2">
              <div className="p-3 border rounded-lg bg-muted/40 space-y-1.5">
                <p>Siswa: <span className="font-bold">{selectedJournal.profiles?.full_name}</span></p>
                <p>Buku: <span className="font-semibold">{selectedJournal.book_title}</span></p>
                <p className="italic leading-normal text-muted-foreground font-medium">&ldquo;{selectedJournal.summary}&rdquo;</p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="tNotes">Catatan / Umpan Balik Guru</Label>
                <textarea
                  id="tNotes"
                  placeholder="e.g. Ringkasan yang kritis dan sangat deskriptif. Pertahankan!"
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  className="min-h-16 w-full rounded border p-2 bg-background focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold mt-1">
                <input
                  type="checkbox"
                  checked={verifyApprove}
                  onChange={(e) => setVerifyApprove(e.target.checked)}
                  className="rounded border text-primary"
                />
                <span>Setujui (Tandai terverifikasi)</span>
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => verifyJournalMutation.mutate()} disabled={verifyJournalMutation.isPending}>
              {verifyJournalMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Kirim Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Dialog: Reading Journal details view */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Detail Jurnal Membaca</DialogTitle>
            <DialogDescription>Review bibliografi ringkasan cerita sirkulasi SNP.</DialogDescription>
          </DialogHeader>

          {selectedJournal && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Buku & Ringkasan</span>
                <h3 className="text-sm font-bold text-foreground leading-tight">{selectedJournal.book_title}</h3>
                <p className="text-[11px] text-muted-foreground">Pengarang: <span className="font-semibold">{selectedJournal.author || "-"}</span></p>
                <div className="p-3 border rounded bg-muted/20 leading-relaxed italic text-muted-foreground font-medium">
                  &ldquo;{selectedJournal.summary}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-b py-3 text-[10px] text-muted-foreground">
                <div>
                  <span>Halaman Dibaca:</span>
                  <span className="block font-bold text-foreground text-xs mt-0.5">{selectedJournal.pages_read} hlm</span>
                </div>
                <div>
                  <span>Tanggal Membaca:</span>
                  <span className="block font-bold text-foreground text-xs mt-0.5">{selectedJournal.read_date}</span>
                </div>
              </div>

              {selectedJournal.teacher_notes && (
                <div className="space-y-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3.5">
                  <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                    <MessageSquare className="h-4 w-4" /> Umpan Balik Guru
                  </span>
                  <p className="text-muted-foreground leading-normal italic">
                    &ldquo;{selectedJournal.teacher_notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 9. Sheet: Add agenda event */}
      <Sheet open={eventOpen} onOpenChange={setEventOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Tambah Agenda Literasi</SheetTitle>
            <SheetDescription>Daftarkan perlombaan resensi, bedah buku, atau workshop GLS baru.</SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createEventMutation.mutate();
            }}
            className="space-y-4 pt-5"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="evTitle">Judul Kegiatan / Lomba</Label>
              <Input id="evTitle" placeholder="e.g. Lomba Menulis Resensi Bulan Bahasa" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="evType">Jenis Agenda</Label>
              <Select value={eventType} onValueChange={(val: "lomba" | "kegiatan" | "sosialisasi") => setEventType(val)}>
                <SelectTrigger id="evType">
                  <SelectValue placeholder="Pilih Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lomba">Lomba (Competitions)</SelectItem>
                  <SelectItem value="kegiatan">Kegiatan (Events)</SelectItem>
                  <SelectItem value="sosialisasi">Sosialisasi (Workshops)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="evDate">Tanggal Pelaksanaan</Label>
              <Input id="evDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="evPhoto">URL Foto Dokumentasi Gallery (Optional)</Label>
              <Input id="evPhoto" placeholder="https://..." value={eventPhoto} onChange={(e) => setEventPhoto(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="evDesc">Rincian Kegiatan</Label>
              <textarea
                id="evDesc"
                placeholder="Rincian informasi ketetapan lomba, hadiah, target audiens..."
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                className="min-h-20 w-full rounded border p-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-6">
              <Button type="button" variant="outline" onClick={() => setEventOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending || !eventTitle}>
                {createEventMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Daftarkan Agenda
              </Button>
            </DialogFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
