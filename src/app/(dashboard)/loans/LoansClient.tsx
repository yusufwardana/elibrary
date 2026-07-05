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
  ArrowLeftRight,
  Plus,
  Search,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  Scan,
  BookOpen,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getLoansList,
  getReservationsList,
  getCirculationStats,
  getActiveUsersList,
  createBorrowAction,
  processReturnAction,
  cancelReservationAction,
} from "./actions";
import { getBooksList } from "../books/actions";
import { QrCode } from "@/components/shared/barcode-qr";
import { Borrowing, Reservation, CirculationStats, LoanProfile, BorrowDetail } from "./types";
import { Book } from "../books/types";

interface LoansClientProps {
  initialLoans: Borrowing[];
  initialReservations: Reservation[];
  initialStats: CirculationStats;
  initialUsers: LoanProfile[];
  initialBooks: Book[];
}

export default function LoansClient({
  initialLoans,
  initialReservations,
  initialStats,
  initialUsers,
  initialBooks,
}: LoansClientProps) {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Sheets & Dialogs State
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Focus Records
  const [selectedDetail, setSelectedDetail] = useState<BorrowDetail | null>(null);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);
  const [selectedReturnBorrowing, setSelectedReturnBorrowing] = useState<Borrowing | null>(null);

  // Scanner Simulator Mock State
  const [scanValue, setScanValue] = useState("");
  const [scanType, setScanType] = useState<"barcode" | "qr">("barcode");

  // Return Processing Form State
  const [fineAmount, setFineAmount] = useState(0);
  const [finePaid, setFinePaid] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<"tidak_ada" | "belum_bayar" | "lunas">("tidak_ada");

  // Check out Form State
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default 7 days
    return date.toISOString().split("T")[0];
  });

  // Queries
  const { data: loans } = useQuery<Borrowing[]>({
    queryKey: ["loans-list"],
    queryFn: getLoansList,
    initialData: initialLoans,
  });

  const { data: reservations } = useQuery<Reservation[]>({
    queryKey: ["reservations-list"],
    queryFn: getReservationsList,
    initialData: initialReservations,
  });

  const { data: stats } = useQuery<CirculationStats>({
    queryKey: ["loans-stats"],
    queryFn: getCirculationStats,
    initialData: initialStats,
  });

  const { data: users } = useQuery<LoanProfile[]>({
    queryKey: ["active-users"],
    queryFn: getActiveUsersList,
    initialData: initialUsers,
  });

  const { data: books } = useQuery<Book[]>({
    queryKey: ["books-list"],
    queryFn: getBooksList,
    initialData: initialBooks,
  });

  // Mutations
  const createBorrowMutation = useMutation({
    mutationFn: () => createBorrowAction(selectedUser, selectedBooks, dueDate),
    onSuccess: (data: Borrowing) => {
      queryClient.invalidateQueries({ queryKey: ["loans-list"] });
      queryClient.invalidateQueries({ queryKey: ["loans-stats"] });
      queryClient.invalidateQueries({ queryKey: ["books-list"] });
      setBorrowOpen(false);
      
      // Open print receipt modal immediately for staff
      const fullBorrow = loans?.find(l => l.id === data.id) || data;
      setSelectedBorrowing(fullBorrow);
      setReceiptOpen(true);

      // Reset
      setSelectedUser("");
      setSelectedBooks([]);
      toast.success("Transaksi peminjaman berhasil diproses");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal memproses peminjaman");
    },
  });

  const processReturnMutation = useMutation({
    mutationFn: () => 
      processReturnAction(
        selectedDetail?.id || "", 
        fineAmount, 
        finePaid, 
        paymentStatus
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans-list"] });
      queryClient.invalidateQueries({ queryKey: ["loans-stats"] });
      queryClient.invalidateQueries({ queryKey: ["books-list"] });
      setReturnOpen(false);
      setSelectedDetail(null);
      setSelectedReturnBorrowing(null);
      toast.success("Buku berhasil dikembalikan dan stok diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal memproses pengembalian");
    },
  });

  const cancelResMutation = useMutation({
    mutationFn: cancelReservationAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations-list"] });
      toast.success("Reservasi antrean berhasil dibatalkan");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal membatalkan reservasi");
    },
  });

  // Flat details array from borrowings for easier table display
  const tableData = useMemo(() => {
    const rows: Array<{
      borrowing: Borrowing;
      detail: BorrowDetail;
    }> = [];

    loans.forEach(loan => {
      loan.borrow_details?.forEach(d => {
        rows.push({
          borrowing: loan,
          detail: d
        });
      });
    });

    return rows;
  }, [loans]);

  // Filters logic
  const filteredTableData = useMemo(() => {
    return tableData.filter(row => {
      const matchStatus = 
        statusFilter === "all" || 
        (statusFilter === "aktif" && row.detail.return_status === "dipinjam") ||
        (statusFilter === "kembali" && row.detail.return_status === "kembali");
      return matchStatus;
    });
  }, [tableData, statusFilter]);

  // Handle Return action trigger (Calculates fine dynamically)
  const handleReturnPrompt = useCallback((row: { borrowing: Borrowing; detail: BorrowDetail }) => {
    setSelectedDetail(row.detail);
    setSelectedReturnBorrowing(row.borrowing);

    // Calculate overdue days and fine (e.g. IDR 1,000 per day late)
    const dueDate = new Date(row.borrowing.due_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);

    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && row.detail.return_status === "dipinjam") {
      const computedFine = diffDays * 1000;
      setFineAmount(computedFine);
      setFinePaid(computedFine);
      setPaymentStatus("lunas");
    } else {
      setFineAmount(0);
      setFinePaid(0);
      setPaymentStatus("tidak_ada");
    }

    setReturnOpen(true);
  }, []);

  // Print receipt helper
  const handlePrintReceipt = () => {
    window.print();
  };

  // Mock Barcode Scanner processing
  const handleMockScan = () => {
    if (!scanValue.trim()) {
      toast.warning("Masukkan kode barcode / QR terlebih dahulu");
      return;
    }

    // Try finding the book in the list
    const foundBook = books.find(b => b.barcode === scanValue || b.isbn === scanValue);
    if (!foundBook) {
      toast.error("Buku dengan kode tersebut tidak ditemukan di katalog");
      return;
    }

    if (borrowOpen) {
      if (selectedBooks.includes(foundBook.id)) {
        toast.warning("Buku ini sudah dimasukkan ke daftar pinjam");
      } else {
        setSelectedBooks(prev => [...prev, foundBook.id]);
        toast.success(`Berhasil menambahkan: ${foundBook.title}`);
      }
      setScannerOpen(false);
      setScanValue("");
    } else {
      // Find active loan detail for this book
      const activeRow = tableData.find(
        r => r.detail.book_id === foundBook.id && r.detail.return_status === "dipinjam"
      );

      if (activeRow) {
        setScannerOpen(false);
        setScanValue("");
        handleReturnPrompt(activeRow);
      } else {
        toast.info(`Buku ditemukan: ${foundBook.title} (Tidak ada catatan peminjaman aktif)`);
      }
    }
  };

  // TanStack Table columns config
  const columns = useMemo<ColumnDef<{ borrowing: Borrowing; detail: BorrowDetail }>[]>(
    () => [
      {
        accessorKey: "borrowing.profiles.full_name",
        header: "Nama Anggota",
        cell: ({ row }) => {
          const profile = row.original.borrowing.profiles;
          return (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-500 border border-indigo-500/20">
                {profile?.full_name ? profile.full_name.charAt(0) : "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground truncate text-sm">
                  {profile?.full_name || "N/A"}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {profile?.role || "anggota"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "detail.books.title",
        header: "Buku",
        cell: ({ row }) => {
          const book = row.original.detail.books;
          return (
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-foreground truncate text-sm">{book?.title || "N/A"}</span>
              <span className="text-[10px] text-muted-foreground font-mono">Barcode: {book?.barcode || "-"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "borrowing.borrow_date",
        header: "Tgl Pinjam",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{row.original.borrowing.borrow_date}</span>
            <span className="text-muted-foreground">s/d {row.original.borrowing.due_date}</span>
          </div>
        ),
      },
      {
        accessorKey: "detail.return_status",
        header: "Status",
        cell: ({ row }) => {
          const isReturned = row.original.detail.return_status === "kembali";
          // Check if late
          const isOverdue = 
            !isReturned && 
            new Date(row.original.borrowing.due_date) < new Date();
          
          return (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              isReturned 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : isOverdue 
                ? "bg-destructive/10 text-destructive border-destructive/20" 
                : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
            }`}>
              {isReturned ? "Kembali" : isOverdue ? "Terlambat" : "Dipinjam"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const isReturned = row.original.detail.return_status === "kembali";
          return (
            <div className="flex items-center gap-1.5">
              {!isReturned && (
                <Button size="sm" variant="outline" onClick={() => handleReturnPrompt(row.original)} className="h-7 text-[10px]">
                  Proses Kembali
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => {
                const fullB = loans.find(l => l.id === row.original.borrowing.id);
                if (fullB) {
                  setSelectedBorrowing(fullB);
                  setReceiptOpen(true);
                }
              }} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [handleReturnPrompt, loans]
  );

  const table = useReactTable({
    data: filteredTableData,
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

  // Export Borrowing Report
  const handleExportReport = () => {
    const headers = ["Peminjam", "Peran", "Judul Buku", "Tgl Pinjam", "Tgl Batas", "Status Kembali", "Tgl Kembali"];
    const rows = filteredTableData.map(r => {
      return [
        `"${r.borrowing.profiles?.full_name || "N/A"}"`,
        r.borrowing.profiles?.role || "anggota",
        `"${r.detail.books?.title || "N/A"}"`,
        r.borrowing.borrow_date,
        r.borrowing.due_date,
        r.detail.return_status,
        r.detail.returned_at ? r.detail.returned_at.split("T")[0] : "-",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Sirkulasi_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan sirkulasi berhasil diunduh");
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Transaksi</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalLoans}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Peminjaman terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Peminjaman Aktif</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.activeLoans}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Buku belum kembali</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Peminjaman Terlambat</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-destructive">{stats.overdueLoans}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Melebihi batas tenggat</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Reservasi Menunggu</CardTitle>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalReservations}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Antrean buku habis stok</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts and Reservations Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Circulation Weekly Trend SVG Chart */}
        <Card className="md:col-span-2 border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tren Sirkulasi Mingguan</CardTitle>
            <CardDescription>Grafik sirkulasi pinjam & kembali buku 5 minggu terakhir</CardDescription>
          </CardHeader>
          <CardContent className="h-48 flex items-end justify-between px-6 pt-4 pb-2">
            {/* Custom SVG Bar Chart */}
            <div className="w-full h-full flex flex-col justify-between">
              <div className="flex-1 flex items-end justify-around gap-2 w-full pb-3 border-b border-border/50">
                {/* Week 1 */}
                <div className="flex flex-col items-center gap-1.5 w-10">
                  <div className="w-4 rounded-t bg-indigo-500" style={{ height: "45px" }} title="Pinjam: 12" />
                  <div className="w-4 rounded-t bg-emerald-500" style={{ height: "30px" }} title="Kembali: 8" />
                </div>
                {/* Week 2 */}
                <div className="flex flex-col items-center gap-1.5 w-10">
                  <div className="w-4 rounded-t bg-indigo-500" style={{ height: "65px" }} title="Pinjam: 18" />
                  <div className="w-4 rounded-t bg-emerald-500" style={{ height: "45px" }} title="Kembali: 12" />
                </div>
                {/* Week 3 */}
                <div className="flex flex-col items-center gap-1.5 w-10">
                  <div className="w-4 rounded-t bg-indigo-500" style={{ height: "55px" }} title="Pinjam: 15" />
                  <div className="w-4 rounded-t bg-emerald-500" style={{ height: "60px" }} title="Kembali: 17" />
                </div>
                {/* Week 4 */}
                <div className="flex flex-col items-center gap-1.5 w-10">
                  <div className="w-4 rounded-t bg-indigo-500" style={{ height: "80px" }} title="Pinjam: 22" />
                  <div className="w-4 rounded-t bg-emerald-500" style={{ height: "50px" }} title="Kembali: 14" />
                </div>
                {/* Week 5 */}
                <div className="flex flex-col items-center gap-1.5 w-10">
                  <div className="w-4 rounded-t bg-indigo-500" style={{ height: "95px" }} title="Pinjam: 27" />
                  <div className="w-4 rounded-t bg-emerald-500" style={{ height: "70px" }} title="Kembali: 20" />
                </div>
              </div>
              <div className="flex justify-around text-[10px] text-muted-foreground pt-1.5">
                <span>Mgg 1</span>
                <span>Mgg 2</span>
                <span>Mgg 3</span>
                <span>Mgg 4</span>
                <span>Mgg 5</span>
              </div>
              <div className="flex items-center gap-4 justify-center text-[10px] pt-1">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-indigo-500 rounded-sm" /> Pinjam</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-emerald-500 rounded-sm" /> Kembali</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Queue */}
        <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Antrean Reservasi</CardTitle>
            <CardDescription>Peminjam mengantre buku habis stok</CardDescription>
          </CardHeader>
          <CardContent className="h-48 overflow-y-auto pr-1">
            {reservations.length > 0 ? (
              <div className="space-y-2.5">
                {reservations.map(res => (
                  <div key={res.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/40">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">{res.books?.title}</span>
                      <span className="text-[10px] text-muted-foreground truncate">Oleh: {res.profiles?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 uppercase font-bold">
                        Queue
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => cancelResMutation.mutate(res.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs pb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-1.5" />
                <span>Tidak ada antrean aktif</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Circulation Table Log */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Transaksi Sirkulasi</CardTitle>
            <CardDescription>Kelola peminjaman buku, pengembalian, denda keterlambatan, dan laporan sirkulasi</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Mock Scanner Trigger */}
            <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)} className="gap-2 text-xs">
              <Scan className="h-3.5 w-3.5" />
              Scan Barcode / QR
            </Button>

            {/* Export report */}
            <Button variant="outline" size="sm" onClick={handleExportReport} className="gap-2 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Cetak Laporan
            </Button>

            {/* Checkout Action */}
            <Button onClick={() => setBorrowOpen(true)} size="sm" className="gap-2 text-xs">
              <Plus className="h-4 w-4" />
              Transaksi Baru
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls: Search & Dropdown Status Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari peminjaman berdasarkan nama siswa atau judul buku..."
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
                <SelectItem value="all">Semua Transaksi</SelectItem>
                <SelectItem value="aktif">Dipinjam (Aktif)</SelectItem>
                <SelectItem value="kembali">Sudah Kembali</SelectItem>
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
                      <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="font-semibold text-foreground">Tidak ada transaksi sirkulasi</p>
                      <p className="text-xs mt-1">Coba masukkan pencarian nama anggota atau buku lainnya.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-muted-foreground">
              Menampilkan {table.getRowModel().rows.length} dari {filteredTableData.length} baris peminjaman
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

      {/* 4. Sheet: Transaksi Peminjaman Baru */}
      <Sheet open={borrowOpen} onOpenChange={setBorrowOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Proses Peminjaman Baru</SheetTitle>
            <SheetDescription>Masukkan nama anggota dan pilih buku yang dipinjam.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-5">
            {/* Member selector */}
            <div className="grid gap-1.5">
              <Label htmlFor="userId">Pilih Peminjam (Anggota)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="userId">
                  <SelectValue placeholder="Pilih Siswa / Guru" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.role === "siswa" ? "Siswa" : "Guru/Staf"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="grid gap-1.5">
              <Label htmlFor="dueDate">Batas Tanggal Pengembalian</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            {/* Books selector list */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Daftar Buku Dipinjam</Label>
                <Button type="button" variant="ghost" onClick={() => {
                  setScanValue("");
                  setScanType("barcode");
                  setScannerOpen(true);
                }} className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10">
                  + Scan Barcode
                </Button>
              </div>
              
              <div className="rounded-md border border-input p-2.5 max-h-40 overflow-y-auto space-y-1.5 bg-background">
                {books.map(b => {
                  const isChecked = selectedBooks.includes(b.id);
                  const isOutOfStock = b.available_quantity <= 0;
                  return (
                    <label key={b.id} className={`flex items-center justify-between text-xs font-medium cursor-pointer p-1 rounded hover:bg-muted/40 ${
                      isOutOfStock && !isChecked ? "opacity-50" : ""
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isOutOfStock && !isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBooks(prev => [...prev, b.id]);
                            } else {
                              setSelectedBooks(prev => prev.filter(id => id !== b.id));
                            }
                          }}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="truncate max-w-[200px]">{b.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {isOutOfStock ? "Kosong" : `Stok: ${b.available_quantity}`}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Siswa dibatasi maksimal 3 buku, sedangkan Guru maksimal 5 buku dipinjam aktif.
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-6">
            <Button variant="outline" onClick={() => setBorrowOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => createBorrowMutation.mutate()}
              disabled={createBorrowMutation.isPending || !selectedUser || selectedBooks.length === 0}
            >
              {createBorrowMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proses Pinjam
            </Button>
          </DialogFooter>
        </SheetContent>
      </Sheet>

      {/* 5. Dialog: Return Book Confirmation with Fines details */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Proses Pengembalian Buku</DialogTitle>
            <DialogDescription>Konfirmasi pengembalian buku dan verifikasi denda keterlambatan.</DialogDescription>
          </DialogHeader>

          {selectedDetail && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
                <p>
                  Peminjam: <span className="font-bold">{selectedReturnBorrowing?.profiles?.full_name}</span>
                </p>
                <p>
                  Buku: <span className="font-semibold">{selectedDetail.books?.title}</span>
                </p>
                <p>
                  Batas Tenggat: <span className="font-semibold font-mono">{selectedReturnBorrowing?.due_date}</span>
                </p>
              </div>

              {/* Fines Area */}
              <div className="grid gap-2 border-t pt-3">
                <h4 className="font-bold text-foreground">Denda Keterlambatan</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="fineAmount">Besar Denda (IDR)</Label>
                    <Input
                      id="fineAmount"
                      type="number"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="finePaid">Denda Dibayar (IDR)</Label>
                    <Input
                      id="finePaid"
                      type="number"
                      value={finePaid}
                      onChange={(e) => setFinePaid(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5 mt-1">
                  <Label htmlFor="payStatus">Status Pembayaran</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(val: "tidak_ada" | "belum_bayar" | "lunas") => setPaymentStatus(val)}
                  >
                    <SelectTrigger id="payStatus">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tidak_ada">Bebas Denda / Tidak Ada</SelectItem>
                      <SelectItem value="belum_bayar">Belum Lunas (Tunggakan)</SelectItem>
                      <SelectItem value="lunas">Lunas (Lunas Dibayar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => processReturnMutation.mutate()} disabled={processReturnMutation.isPending}>
              {processReturnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi Kembali
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Printable Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md print:max-w-full print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Bukti Transaksi Sirkulasi</DialogTitle>
            <DialogDescription>Format tanda terima peminjaman buku perpustakaan sekolah.</DialogDescription>
          </DialogHeader>

          {selectedBorrowing && (
            <div id="printable-receipt-area" className="p-6 border rounded-lg bg-card text-foreground font-mono space-y-4 text-xs shadow-inner">
              <div className="text-center border-b pb-3 space-y-1">
                <h3 className="font-extrabold text-base uppercase">E-Perpustakaan</h3>
                <p className="text-[10px] text-muted-foreground">SMP/SMA Negeri School Library System</p>
                <p className="text-[9px] text-muted-foreground">Tgl Cetak: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="space-y-1.5 border-b pb-3 text-[10px]">
                <p>No. Transaksi: <span className="font-semibold">{selectedBorrowing.id.slice(0,8).toUpperCase()}</span></p>
                <p>Peminjam    : <span className="font-semibold">{selectedBorrowing.profiles?.full_name}</span></p>
                <p>Tanggal Pinjam: <span className="font-semibold">{selectedBorrowing.borrow_date}</span></p>
                <p>Batas Kembali : <span className="font-semibold text-amber-600">{selectedBorrowing.due_date}</span></p>
              </div>

              <div className="space-y-2 border-b pb-3">
                <p className="font-bold text-[10px]">DAFTAR BUKU:</p>
                {selectedBorrowing.borrow_details?.map((d, index) => (
                  <div key={d.id} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[240px]">{index + 1}. {d.books?.title}</span>
                    <span className="font-semibold text-indigo-500 uppercase">{d.return_status}</span>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2 space-y-2">
                <p className="text-[9px] leading-relaxed text-muted-foreground">
                  * Harap kembalikan buku sebelum tanggal jatuh tempo.<br />
                  * Keterlambatan dikenakan denda Rp 1.000 / hari per buku.
                </p>
                <div className="flex justify-center pt-2">
                  <QrCode value={`borrow-${selectedBorrowing.id}`} size={60} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              Tutup
            </Button>
            <Button onClick={handlePrintReceipt} className="gap-2">
              <Printer className="h-4 w-4" />
              Cetak Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Barcode / QR Scanner Modal Simulator */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              Scanner Simulator
            </DialogTitle>
            <DialogDescription>Pindai kode barcode ISBN buku atau kartu anggota.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 flex flex-col items-center">
            {/* Visual Scan Feed Indicator */}
            <div className="relative h-40 w-full rounded-lg bg-slate-900 border border-slate-700/50 overflow-hidden flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent animate-pulse" />
              {/* Laser line animation */}
              <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_10px_#ef4444] top-1/2 -translate-y-1/2 animate-bounce-vertical" />
              <Scan className="h-10 w-10 text-white/20 animate-pulse" />
            </div>

            <div className="w-full space-y-3 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="scanValue">Simulasi Input Kode Barcode / ISBN</Label>
                <Input
                  id="scanValue"
                  placeholder="e.g. 978-602-291-662-8"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant={scanType === "barcode" ? "default" : "outline"} size="sm" onClick={() => setScanType("barcode")} className="flex-1 text-[11px]">
                  Barcode Mode
                </Button>
                <Button variant={scanType === "qr" ? "default" : "outline"} size="sm" onClick={() => setScanType("qr")} className="flex-1 text-[11px]">
                  QR Code Mode
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScannerOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleMockScan}>
              Kirim Input Scanner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
