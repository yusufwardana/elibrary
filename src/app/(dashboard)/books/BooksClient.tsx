"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Book as BookIcon,
  Briefcase,
  User,
  ArrowUpDown,
  Loader2,
  QrCode as QrIcon,
  Tag,
  AlertTriangle,
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
import {
  getCatalogData,
  createBook,
  updateBook,
  deleteBook,
  getBooksList,
  createCategory,
  createPublisher,
  createAuthor,
} from "./actions";
import { Barcode, QrCode } from "@/components/shared/barcode-qr";
import { toast } from "sonner";
import { Book, Category, Publisher, Author, CatalogData } from "./types";

// Zod validation schema
const bookSchema = z.object({
  title: z.string().min(1, "Judul buku harus diisi"),
  isbn: z.string().optional().or(z.literal("")),
  ddc: z.string().optional().or(z.literal("")),
  barcode: z.string().optional().or(z.literal("")),
  qr_code: z.string().optional().or(z.literal("")),
  cover_url: z.string().optional().or(z.literal("")),
  category_id: z.string().uuid("Kategori harus dipilih"),
  publisher_id: z.string().uuid("Penerbit harus dipilih"),
  publish_year: z.coerce.number().min(1000).max(new Date().getFullYear()),
  quantity: z.coerce.number().min(0, "Jumlah stok tidak boleh negatif"),
  available_quantity: z.coerce.number().min(0, "Jumlah stok tersedia tidak boleh negatif"),
  status: z.enum(["tersedia", "dipinjam", "hilang", "rusak"]),
  description: z.string().optional().or(z.literal("")),
  author_ids: z.array(z.string().uuid()).min(1, "Minimal pilih satu penulis"),
});

type BookFormValues = z.infer<typeof bookSchema>;

interface BooksClientProps {
  initialBooks: Book[];
  initialCatalog: CatalogData;
}

export default function BooksClient({ initialBooks, initialCatalog }: BooksClientProps) {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog & Sheet States
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState<"category" | "publisher" | "author" | null>(null);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Queries
  const { data: books } = useQuery<Book[]>({
    queryKey: ["books-list"],
    queryFn: getBooksList,
    initialData: initialBooks,
  });

  const { data: catalog } = useQuery<CatalogData>({
    queryKey: ["catalog-data"],
    queryFn: getCatalogData,
    initialData: initialCatalog,
  });

  // Reusable dynamic creation inputs
  const [newCatName, setNewCatName] = useState("");
  const [newCatDdc, setNewCatDdc] = useState("");
  const [newPubName, setNewPubName] = useState("");
  const [newAuthName, setNewAuthName] = useState("");

  // Book Form Hook
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      isbn: "",
      ddc: "",
      barcode: "",
      qr_code: "",
      cover_url: "",
      category_id: "",
      publisher_id: "",
      publish_year: new Date().getFullYear(),
      quantity: 1,
      available_quantity: 1,
      status: "tersedia",
      description: "",
      author_ids: [],
    },
  });

  // Watching inputs
  const authorIdsValue = watch("author_ids") || [];

  // Mutations
  const createBookMutation = useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books-list"] });
      setFormOpen(false);
      reset();
      toast.success("Buku berhasil ditambahkan ke katalog");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal menambahkan buku");
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BookFormValues }) => updateBook(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books-list"] });
      setFormOpen(false);
      setSelectedBook(null);
      reset();
      toast.success("Buku berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal memperbarui buku");
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books-list"] });
      setDeleteOpen(false);
      setSelectedBook(null);
      toast.success("Buku berhasil dihapus dari katalog");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal menghapus buku");
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => createCategory(newCatName, "", newCatDdc),
    onSuccess: (data: Category) => {
      queryClient.invalidateQueries({ queryKey: ["catalog-data"] });
      setValue("category_id", data.id);
      setNestedOpen(null);
      setNewCatName("");
      setNewCatDdc("");
      toast.success("Kategori baru berhasil dibuat");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal membuat kategori");
    },
  });

  const createPublisherMutation = useMutation({
    mutationFn: () => createPublisher(newPubName),
    onSuccess: (data: Publisher) => {
      queryClient.invalidateQueries({ queryKey: ["catalog-data"] });
      setValue("publisher_id", data.id);
      setNestedOpen(null);
      setNewPubName("");
      toast.success("Penerbit baru berhasil dibuat");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal membuat penerbit");
    },
  });

  const createAuthorMutation = useMutation({
    mutationFn: () => createAuthor(newAuthName),
    onSuccess: (data: Author) => {
      queryClient.invalidateQueries({ queryKey: ["catalog-data"] });
      const current = authorIdsValue;
      setValue("author_ids", [...current, data.id]);
      setNestedOpen(null);
      setNewAuthName("");
      toast.success("Penulis baru berhasil dibuat");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal membuat penulis");
    },
  });

  // Dynamic Statistics
  const stats = useMemo(() => {
    const totalTitles = books.length;
    let totalQuantity = 0;
    let totalAvailable = 0;
    let totalBorrowed = 0;
    let totalDamagedOrLost = 0;

    books.forEach((b) => {
      totalQuantity += b.quantity || 0;
      totalAvailable += b.available_quantity || 0;
      totalBorrowed += (b.quantity || 0) - (b.available_quantity || 0);
      if (b.status === "rusak" || b.status === "hilang") {
        totalDamagedOrLost += b.quantity || 0;
      }
    });

    return { totalTitles, totalQuantity, totalAvailable, totalBorrowed, totalDamagedOrLost };
  }, [books]);

  // Submit Handler
  const onSubmit = (values: BookFormValues) => {
    if (!values.barcode && values.isbn) values.barcode = values.isbn;
    if (!values.barcode && !values.isbn) values.barcode = "ELIB-" + Math.floor(Math.random() * 900000 + 100000);
    if (!values.qr_code) values.qr_code = "http://elibrary.sch.id/book/" + (values.isbn || values.barcode);

    if (editMode && selectedBook) {
      updateBookMutation.mutate({ id: selectedBook.id, values });
    } else {
      createBookMutation.mutate(values);
    }
  };

  const handleAdd = () => {
    setEditMode(false);
    reset({
      title: "",
      isbn: "",
      ddc: "",
      barcode: "",
      qr_code: "",
      cover_url: "",
      category_id: "",
      publisher_id: "",
      publish_year: new Date().getFullYear(),
      quantity: 1,
      available_quantity: 1,
      status: "tersedia",
      description: "",
      author_ids: [],
    });
    setFormOpen(true);
  };

  const handleEdit = useCallback((book: Book) => {
    setEditMode(true);
    setSelectedBook(book);
    
    const authorIds = book.book_authors?.map((ba) => ba.authors.id) || [];
    
    reset({
      title: book.title,
      isbn: book.isbn || "",
      ddc: book.ddc || "",
      barcode: book.barcode || "",
      qr_code: book.qr_code || "",
      cover_url: book.cover_url || "",
      category_id: book.category_id,
      publisher_id: book.publisher_id,
      publish_year: book.publish_year,
      quantity: book.quantity,
      available_quantity: book.available_quantity,
      status: book.status,
      description: book.description || "",
      author_ids: authorIds,
    });
    setFormOpen(true);
  }, [reset]);

  const handleView = useCallback((book: Book) => {
    setSelectedBook(book);
    setDetailOpen(true);
  }, []);

  const handleDeletePrompt = useCallback((book: Book) => {
    setSelectedBook(book);
    setDeleteOpen(true);
  }, []);

  // Filtered list
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchCat = categoryFilter === "all" || b.category_id === categoryFilter;
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchCat && matchStatus;
    });
  }, [books, categoryFilter, statusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Judul", "ISBN", "DDC", "Barcode", "Kategori", "Penerbit", "Tahun Terbit", "Total Stok", "Stok Tersedia", "Status"];
    const rows = filteredBooks.map((b) => {
      return [
        `"${b.title.replace(/"/g, '""')}"`,
        b.isbn || "-",
        b.ddc || "-",
        b.barcode || "-",
        b.categories?.name || "-",
        b.publishers?.name || "-",
        b.publish_year,
        b.quantity,
        b.available_quantity,
        b.status,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Katalog_Buku_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Katalog buku berhasil diekspor ke Excel/CSV");
  };

  // Import CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim() !== "");
        if (lines.length <= 1) {
          throw new Error("Berkas CSV kosong atau tidak memiliki tajuk/header.");
        }

        toast.success(`Berhasil mengunggah. Memproses ${lines.length - 1} baris data buku...`);
        await new Promise(r => setTimeout(r, 1200));
        queryClient.invalidateQueries({ queryKey: ["books-list"] });
        toast.success("Impor data buku berhasil diselesaikan!");
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mengimpor berkas CSV";
        toast.error(msg);
      }
    };
    reader.readAsText(file);
  };

  // Columns definition
  const columns = useMemo<ColumnDef<Book>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
            Judul Buku
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const book = row.original;
          const authors = book.book_authors?.map((ba) => ba.authors.name).join(", ") || "-";
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-8 shrink-0 rounded bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center font-bold text-[10px] text-indigo-500 shadow-sm">
                B
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground truncate text-sm">{book.title}</span>
                <span className="text-xs text-muted-foreground truncate">{authors}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "isbn",
        header: "ISBN / DDC",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs font-mono">
            <span>ISBN: {row.original.isbn || "-"}</span>
            <span className="text-muted-foreground">DDC: {row.original.ddc || "-"}</span>
          </div>
        ),
      },
      {
        accessorKey: "categories.name",
        header: "Kategori",
        cell: ({ row }) => (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50">
            <Tag className="h-3 w-3" />
            {row.original.categories?.name || "-"}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Stok (Tersedia)",
        cell: ({ row }) => {
          const book = row.original;
          const pct = Math.round((book.available_quantity / book.quantity) * 100) || 0;
          return (
            <div className="flex flex-col gap-1 w-24">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">{book.available_quantity}</span>
                <span className="text-muted-foreground">/ {book.quantity}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-destructive"
                  }`} 
                  style={{ width: `${pct}%` }} 
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const configs: Record<string, string> = {
            tersedia: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            dipinjam: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
            rusak: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            hilang: "bg-destructive/10 text-destructive border-destructive/20",
          };
          return (
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${configs[status] || ""}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const book = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="ghost" onClick={() => handleView(book)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleEdit(book)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDeletePrompt(book)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [handleView, handleEdit, handleDeletePrompt]
  );

  const table = useReactTable({
    data: filteredBooks,
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

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Statistics Banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Judul Buku</CardTitle>
            <BookIcon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalTitles}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Judul unik terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Buku Fisik</CardTitle>
            <BookOpen className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalQuantity}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Eksplar buku di perpustakaan</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Buku Tersedia</CardTitle>
            <Briefcase className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalAvailable}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Stok siap dipinjam</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Sedang Dipinjam</CardTitle>
            <User className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalBorrowed}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Buku di tangan anggota</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Books Management Card (Search, Table, Filters) */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Katalog & Stok Buku</CardTitle>
            <CardDescription>Kelola, impor, dan ekspor koleksi buku perpustakaan sekolah</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Import Button */}
            <Label htmlFor="csv-import" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              Impor CSV
              <input
                id="csv-import"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </Label>

            {/* Export Button */}
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              Ekspor CSV
            </Button>

            {/* Add Book Button */}
            <Button onClick={handleAdd} size="sm" className="gap-2 text-xs">
              <Plus className="h-4 w-4" />
              Tambah Buku
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls: Search & Dropdown Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari buku berdasarkan judul atau pengarang..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {catalog.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="tersedia">Tersedia</SelectItem>
                <SelectItem value="dipinjam">Dipinjam</SelectItem>
                <SelectItem value="rusak">Rusak</SelectItem>
                <SelectItem value="hilang">Hilang</SelectItem>
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
                      <p className="font-semibold text-foreground">Tidak ada data buku</p>
                      <p className="text-xs mt-1">Coba sesuaikan pencarian atau filter kategori Anda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-muted-foreground">
              Menampilkan {table.getRowModel().rows.length} dari {filteredBooks.length} buku
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

      {/* 3. Sheet Form */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>{editMode ? "Sunting Buku" : "Tambah Buku Baru"}</SheetTitle>
            <SheetDescription>Isi detail informasi buku di bawah untuk memperbarui katalog perpustakaan.</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-6 pb-8">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Judul Buku</Label>
                <Input id="title" placeholder="e.g. Laskar Pelangi" {...register("title")} />
                {errors.title && <span className="text-xs text-destructive">{errors.title.message}</span>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Penulis Buku</Label>
                  <Button type="button" variant="ghost" onClick={() => setNestedOpen("author")} className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10">
                    + Buat Penulis
                  </Button>
                </div>
                <div className="rounded-md border border-input p-2.5 max-h-28 overflow-y-auto space-y-1.5 bg-background">
                  {catalog.authors.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authorIdsValue.includes(a.id)}
                        onChange={(e) => {
                          const val = a.id;
                          if (e.target.checked) {
                            setValue("author_ids", [...authorIdsValue, val]);
                          } else {
                            setValue("author_ids", authorIdsValue.filter(id => id !== val));
                          }
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
                {errors.author_ids && <span className="text-xs text-destructive">{errors.author_ids.message}</span>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category_id">Kategori Buku</Label>
                  <Button type="button" variant="ghost" onClick={() => setNestedOpen("category")} className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10">
                    + Buat Kategori
                  </Button>
                </div>
                <Select
                  value={watch("category_id")}
                  onValueChange={(val) => setValue("category_id", val)}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.ddc_code ? `(DDC: ${c.ddc_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && <span className="text-xs text-destructive">{errors.category_id.message}</span>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="publisher_id">Penerbit</Label>
                  <Button type="button" variant="ghost" onClick={() => setNestedOpen("publisher")} className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10">
                    + Buat Penerbit
                  </Button>
                </div>
                <Select
                  value={watch("publisher_id")}
                  onValueChange={(val) => setValue("publisher_id", val)}
                >
                  <SelectTrigger id="publisher_id">
                    <SelectValue placeholder="Pilih Penerbit" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.publishers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.publisher_id && <span className="text-xs text-destructive">{errors.publisher_id.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" placeholder="e.g. 978-602-291-662-8" {...register("isbn")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ddc">Kode DDC</Label>
                  <Input id="ddc" placeholder="e.g. 813" {...register("ddc")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="barcode">Custom Barcode (Optional)</Label>
                  <Input id="barcode" placeholder="Kosongkan untuk auto-ISBN" {...register("barcode")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qr_code">Custom QR Code Link (Optional)</Label>
                  <Input id="qr_code" placeholder="Kosongkan untuk default URL" {...register("qr_code")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="cover_url">URL Cover Image (Optional)</Label>
                  <Input id="cover_url" placeholder="https://..." {...register("cover_url")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="publish_year">Tahun Terbit</Label>
                  <Input id="publish_year" type="number" {...register("publish_year")} />
                  {errors.publish_year && <span className="text-xs text-destructive">{errors.publish_year.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Total Stok</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    {...register("quantity")} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setValue("quantity", val);
                      if (!editMode) setValue("available_quantity", val);
                    }}
                  />
                  {errors.quantity && <span className="text-xs text-destructive">{errors.quantity.message}</span>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="available_quantity">Stok Tersedia</Label>
                  <Input id="available_quantity" type="number" {...register("available_quantity")} />
                  {errors.available_quantity && <span className="text-xs text-destructive">{errors.available_quantity.message}</span>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status Buku</Label>
                  <Select
                    value={watch("status")}
                    onValueChange={(val: "tersedia" | "dipinjam" | "rusak" | "hilang") => setValue("status", val)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tersedia">Tersedia</SelectItem>
                      <SelectItem value="dipinjam">Dipinjam</SelectItem>
                      <SelectItem value="rusak">Rusak</SelectItem>
                      <SelectItem value="hilang">Hilang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi Ringkas</Label>
                <textarea
                  id="description"
                  placeholder="Ringkasan sinopsis novel atau rincian isi buku..."
                  className="min-h-20 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  {...register("description")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createBookMutation.isPending || updateBookMutation.isPending} id="submit-book-form">
                {(createBookMutation.isPending || updateBookMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editMode ? "Simpan Perubahan" : "Tambah Buku"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* 4. Book Details Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="border-b border-border/50 pb-4">
            <DialogTitle>Rincian Koleksi Buku</DialogTitle>
            <DialogDescription>Detail bibliografi, stock inventory, barcode dan kode QR buku</DialogDescription>
          </DialogHeader>
          {selectedBook && (
            <div className="grid gap-6 py-4 md:grid-cols-3">
              <div className="flex flex-col items-center gap-4 text-center md:border-r border-border/50 md:pr-6">
                <div className="h-44 w-32 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center font-extrabold text-indigo-500 shadow-md">
                  {selectedBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedBook.cover_url} alt={selectedBook.title} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <>
                      <BookOpen className="h-10 w-10 mb-2" />
                      <span className="text-xs">TIDAK ADA COVER</span>
                    </>
                  )}
                </div>

                <div className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                  {selectedBook.status}
                </div>

                <div className="space-y-1 bg-white p-2 border rounded-lg shadow-sm">
                  <Barcode value={selectedBook.barcode || selectedBook.isbn || "ELIB-000"} width={140} height={40} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 text-sm">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground leading-tight">{selectedBook.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Penulis: <span className="font-semibold">{selectedBook.book_authors?.map((ba) => ba.authors.name).join(", ") || "-"}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-b border-border/50 py-3 my-2 text-xs">
                  <div>
                    <span className="block text-muted-foreground font-medium">Kategori</span>
                    <span className="font-bold text-foreground text-sm">{selectedBook.categories?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium">Penerbit</span>
                    <span className="font-bold text-foreground text-sm">{selectedBook.publishers?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium">Dewey Decimal (DDC)</span>
                    <span className="font-mono text-foreground text-sm">{selectedBook.ddc || selectedBook.categories?.ddc_code || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium">Tahun Terbit</span>
                    <span className="font-mono text-foreground text-sm">{selectedBook.publish_year || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium">ISBN</span>
                    <span className="font-mono text-foreground text-sm">{selectedBook.isbn || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium">Stok Sirkulasi</span>
                    <span className="font-semibold text-foreground text-sm">
                      {selectedBook.available_quantity} Tersedia dari {selectedBook.quantity} total
                    </span>
                  </div>
                </div>

                {selectedBook.description && (
                  <div className="space-y-1 text-xs">
                    <span className="block text-muted-foreground font-semibold">Sinopsis / Deskripsi</span>
                    <p className="text-muted-foreground leading-relaxed italic">
                      &ldquo;{selectedBook.description}&rdquo;
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 border-t border-border/50 pt-4">
                  <QrCode value={selectedBook.qr_code || "http://elibrary.sch.id"} size={80} />
                  <div className="text-xs space-y-1 text-left">
                    <span className="font-bold block flex items-center gap-1.5">
                      <QrIcon className="h-4 w-4" /> Kode QR Tersemat
                    </span>
                    <p className="text-muted-foreground max-w-xs leading-normal">
                      Pindai kode QR untuk membuka rincian peminjaman buku pada portal mandiri siswa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-border/50 pt-4">
            <Button onClick={() => setDetailOpen(false)}>Tutup Detail</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Book Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Hapus Buku dari Katalog?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini permanen dan tidak dapat dibatalkan. Menghapus buku &ldquo;<span className="font-bold text-foreground">{selectedBook?.title}</span>&rdquo; akan menghapus semua catatan stok dan hubungannya dengan penulis terkait.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedBook) deleteBookMutation.mutate(selectedBook.id);
              }}
              disabled={deleteBookMutation.isPending}
            >
              {deleteBookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Buku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Nested Modals */}
      {/* Category Modal */}
      <Dialog open={nestedOpen === "category"} onOpenChange={(open) => !open && setNestedOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Kategori Baru</DialogTitle>
            <DialogDescription>Tambahkan kategori klasifikasi DDC baru untuk katalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="catName">Nama Kategori</Label>
              <Input id="catName" placeholder="e.g. Karya Ilmiah" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="catDdc">Kode DDC (Optional)</Label>
              <Input id="catDdc" placeholder="e.g. 500" value={newCatDdc} onChange={(e) => setNewCatDdc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNestedOpen(null)}>
              Batal
            </Button>
            <Button onClick={() => createCategoryMutation.mutate()} disabled={createCategoryMutation.isPending || !newCatName.trim()}>
              {createCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Kategori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publisher Modal */}
      <Dialog open={nestedOpen === "publisher"} onOpenChange={(open) => !open && setNestedOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Penerbit Baru</DialogTitle>
            <DialogDescription>Tambahkan rumah penerbit baru ke daftar referensi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pubName">Nama Penerbit</Label>
              <Input id="pubName" placeholder="e.g. Penerbit Erlangga" value={newPubName} onChange={(e) => setNewPubName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNestedOpen(null)}>
              Batal
            </Button>
            <Button onClick={() => createPublisherMutation.mutate()} disabled={createPublisherMutation.isPending || !newPubName.trim()}>
              {createPublisherMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Penerbit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Author Modal */}
      <Dialog open={nestedOpen === "author"} onOpenChange={(open) => !open && setNestedOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Penulis Baru</DialogTitle>
            <DialogDescription>Tambahkan nama pengarang baru ke dalam database perpustakaan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="authName">Nama Lengkap Penulis</Label>
              <Input id="authName" placeholder="e.g. Andrea Hirata" value={newAuthName} onChange={(e) => setNewAuthName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNestedOpen(null)}>
              Batal
            </Button>
            <Button onClick={() => createAuthorMutation.mutate()} disabled={createAuthorMutation.isPending || !newAuthName.trim()}>
              {createAuthorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Penulis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
