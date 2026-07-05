"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
  Package,
  Plus,
  Search,
  Wrench,
  AlertTriangle,
  Download,
  Calendar,
  MapPin,
  Eye,
  Trash2,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  DollarSign,
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
  getAssetsList,
  getInventoryStats,
  getAssetMaintenanceHistory,
  getAssetDamageReports,
  createAssetAction,
  createDamageReportAction,
  logMaintenanceAction,
  logRepairAction,
  deleteAssetAction,
} from "./actions";
import { InventoryAsset, AssetCategory, InventoryStats, AssetMaintenance, DamageReport } from "./types";

interface InventoryClientProps {
  initialAssets: InventoryAsset[];
  initialStats: InventoryStats;
}

const CATEGORIES: Record<AssetCategory, string> = {
  rak_buku: "Rak Buku",
  meja: "Meja",
  kursi: "Kursi",
  komputer: "Komputer",
  printer: "Printer",
  jaringan: "Jaringan",
  ac: "Air Conditioner (AC)",
  proyektor: "Proyektor",
  scanner: "Scanner",
};

export default function InventoryClient({ initialAssets, initialStats }: InventoryClientProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  // Sheets & Dialogs State
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [damageOpen, setDamageOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Focus asset selection
  const [selectedAsset, setSelectedAsset] = useState<InventoryAsset | null>(null);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);

  // Lists fetch states
  const [maintenanceLogs, setMaintenanceLogs] = useState<AssetMaintenance[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Detail Sheet Tabs State: 'info' | 'maintenance' | 'damage'
  const [activeTab, setActiveTab] = useState<"info" | "maintenance" | "damage">("info");

  // Add Asset Form States
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<AssetCategory>("rak_buku");
  const [newLocation, setNewLocation] = useState("");
  const [newPurchaseDate, setNewPurchaseDate] = useState("");
  const [assetPhoto, setAssetPhoto] = useState<File | null>(null);

  // Log Maintenance Form States
  const [maintDetails, setMaintDetails] = useState("");
  const [maintCost, setMaintCost] = useState(0);
  const [maintDate, setMaintDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [maintNextDate, setMaintNextDate] = useState("");
  const [maintPerformedBy, setMaintPerformedBy] = useState("");

  // Log Damage Form States
  const [damageDesc, setDamageDesc] = useState("");
  const [damageSeverity, setDamageSeverity] = useState<"rusak_ringan" | "rusak_berat">("rusak_ringan");

  // Log Repair Form States
  const [repairDetails, setRepairDetails] = useState("");
  const [repairCost, setRepairCost] = useState(0);
  const [repairPerformedBy, setRepairPerformedBy] = useState("");
  const [markResolved, setMarkResolved] = useState(true);

  // Queries
  const { data: assets } = useQuery<InventoryAsset[]>({
    queryKey: ["inventory-assets"],
    queryFn: getAssetsList,
    initialData: initialAssets,
  });

  const { data: stats } = useQuery<InventoryStats>({
    queryKey: ["inventory-stats"],
    queryFn: getInventoryStats,
    initialData: initialStats,
  });

  // Mutations
  const createAssetMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("name", newName);
      fd.append("category", newCategory);
      fd.append("location", newLocation);
      fd.append("purchase_date", newPurchaseDate);
      if (assetPhoto) fd.append("photo", assetPhoto);
      return createAssetAction(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-assets"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      setAddOpen(false);
      // Reset
      setNewName("");
      setNewLocation("");
      setNewPurchaseDate("");
      setAssetPhoto(null);
      toast.success("Aset inventaris baru berhasil didaftarkan");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal menambah aset");
    },
  });

  const createDamageMutation = useMutation({
    mutationFn: () => createDamageReportAction(selectedAsset?.id || "", damageDesc, damageSeverity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-assets"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      setDamageOpen(false);
      setDamageDesc("");
      if (selectedAsset) handleOpenDetail(selectedAsset, "damage");
      toast.success("Laporan kerusakan aset berhasil dicatat");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal melaporkan kerusakan");
    },
  });

  const logMaintMutation = useMutation({
    mutationFn: () =>
      logMaintenanceAction(
        selectedAsset?.id || "",
        maintDetails,
        maintCost,
        maintDate,
        maintNextDate,
        maintPerformedBy
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-assets"] });
      setMaintOpen(false);
      setMaintDetails("");
      setMaintCost(0);
      setMaintPerformedBy("");
      if (selectedAsset) handleOpenDetail(selectedAsset, "maintenance");
      toast.success("Catatan pemeliharaan preventif berhasil didokumentasikan");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mencatat pemeliharaan");
    },
  });

  const logRepairMutation = useMutation({
    mutationFn: () =>
      logRepairAction(
        selectedReport?.id || "",
        repairDetails,
        repairCost,
        repairPerformedBy,
        markResolved
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-assets"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      setRepairOpen(false);
      setRepairDetails("");
      setRepairCost(0);
      setRepairPerformedBy("");
      if (selectedAsset) handleOpenDetail(selectedAsset, "damage");
      toast.success("Log perbaikan berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mencatat perbaikan");
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: deleteAssetAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-assets"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      setDeleteOpen(false);
      setDetailOpen(false);
      setSelectedAsset(null);
      toast.success("Aset berhasil dihapus dari sistem");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal menghapus aset");
    },
  });

  // Table logic
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchCat = categoryFilter === "all" || a.category === categoryFilter;
      const matchCond = conditionFilter === "all" || a.condition === conditionFilter;
      return matchCat && matchCond;
    });
  }, [assets, categoryFilter, conditionFilter]);

  const handleOpenDetail = useCallback(async (asset: InventoryAsset, defaultTab: "info" | "maintenance" | "damage" = "info") => {
    setSelectedAsset(asset);
    setActiveTab(defaultTab);
    setDetailOpen(true);
    setLoadingHistory(true);

    try {
      const [maint, dmg] = await Promise.all([
        getAssetMaintenanceHistory(asset.id),
        getAssetDamageReports(asset.id),
      ]);
      setMaintenanceLogs(maint);
      setDamageReports(dmg);
    } catch {
      toast.error("Gagal memuat log riwayat aset");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleOpenRepair = useCallback(async (report: DamageReport) => {
    setSelectedReport(report);
    setRepairOpen(true);
  }, []);

  // Columns definition
  const columns = useMemo<ColumnDef<InventoryAsset>[]>(
    () => [
      {
        accessorKey: "asset_code",
        header: "Kode Aset",
        cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.original.asset_code}</span>,
      },
      {
        accessorKey: "name",
        header: "Nama Aset",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border flex items-center justify-center text-indigo-500">
              <Package className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold truncate text-sm">{row.original.name}</span>
              <span className="text-[10px] text-muted-foreground">{CATEGORIES[row.original.category]}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "Lokasi Ruang",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {row.original.location || "-"}
          </span>
        ),
      },
      {
        accessorKey: "condition",
        header: "Kondisi",
        cell: ({ row }) => {
          const cond = row.original.condition;
          const style =
            cond === "baik"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : cond === "rusak_ringan"
              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20";
          
          return (
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${style}`}>
              {cond.replace("_", " ")}
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
            <Button size="icon" variant="ghost" onClick={() => { setSelectedAsset(row.original); setDeleteOpen(true); }} className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenDetail]
  );

  const table = useReactTable({
    data: filteredAssets,
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

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ["Kode Aset", "Nama", "Kategori", "Lokasi", "Kondisi", "Tgl Pembelian"];
    const rows = filteredAssets.map((a) => [
      a.asset_code,
      `"${a.name.replace(/"/g, '""')}"`,
      CATEGORIES[a.category],
      a.location || "-",
      a.condition,
      a.purchase_date || "-",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Aset_Perpustakaan_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan inventaris aset berhasil diunduh");
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Aset Fisik</CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalAssets}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Barang inventaris tercatat</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Kondisi Baik</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.goodAssets}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Aset layak pakai penuh</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Rusak Ringan</CardTitle>
            <Wrench className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.lightDamagedAssets}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Butuh pemeliharaan/perbaikan</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Rusak Berat</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-destructive">{stats.heavyDamagedAssets}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Aset tidak dapat digunakan</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts Breakdown Card */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Distribusi Kondisi & Kategori Aset</CardTitle>
          <CardDescription>Bagan persentase kelayakan sarana prasarana sekolah</CardDescription>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-around px-6">
          {/* Visual SVG Segmented Bar Chart */}
          <div className="w-full space-y-3.5 max-w-xl text-xs">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Kelayakan Sarana SNP</span>
              <span>
                {stats.totalAssets > 0 ? Math.round((stats.goodAssets / stats.totalAssets) * 100) : 0}% Layak Pakai
              </span>
            </div>
            {/* Multi-segment progress bar */}
            <div className="h-4 w-full rounded-full bg-muted flex overflow-hidden border">
              <div className="bg-emerald-500 h-full" style={{ width: `${(stats.goodAssets / (stats.totalAssets || 1)) * 100}%` }} title="Baik" />
              <div className="bg-amber-500 h-full" style={{ width: `${(stats.lightDamagedAssets / (stats.totalAssets || 1)) * 100}%` }} title="Rusak Ringan" />
              <div className="bg-red-500 h-full" style={{ width: `${(stats.heavyDamagedAssets / (stats.totalAssets || 1)) * 100}%` }} title="Rusak Berat" />
            </div>
            <div className="flex items-center justify-center gap-6 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-emerald-500 rounded-sm" /> Baik ({stats.goodAssets})</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-amber-500 rounded-sm" /> Rusak Ringan ({stats.lightDamagedAssets})</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-red-500 rounded-sm" /> Rusak Berat ({stats.heavyDamagedAssets})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Assets Management Table */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Aset Inventaris</CardTitle>
            <CardDescription>Catat sarana prasarana, kelola penjadwalan pemeliharaan, denda kerusakan, dan histori perbaikan</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              Ekspor Laporan
            </Button>
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2 text-xs">
              <Plus className="h-4 w-4" />
              Registrasi Aset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls: Search & Dropdown Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari aset berdasarkan kode atau nama barang..."
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
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Semua Kondisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kondisi</SelectItem>
                <SelectItem value="baik">Baik</SelectItem>
                <SelectItem value="rusak_ringan">Rusak Ringan</SelectItem>
                <SelectItem value="rusak_berat">Rusak Berat</SelectItem>
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
                      <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="font-semibold text-foreground">Tidak ada aset inventaris</p>
                      <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau kategori filter Anda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-muted-foreground">
              Menampilkan {table.getRowModel().rows.length} dari {filteredAssets.length} aset
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

      {/* 4. Sheet: Registrasi Aset Baru */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Registrasi Aset Inventaris</SheetTitle>
            <SheetDescription>Tambahkan sarana prasarana baru ke dalam database inventaris perpustakaan.</SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAssetMutation.mutate();
            }}
            className="space-y-4 pt-5"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="assetName">Nama Aset</Label>
              <Input id="assetName" placeholder="e.g. Rak Novel Kayu Jati" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="assetCat">Kategori Aset</Label>
              <Select value={newCategory} onValueChange={(val: AssetCategory) => setNewCategory(val)}>
                <SelectTrigger id="assetCat">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="assetLoc">Lokasi Penempatan</Label>
              <Input id="assetLoc" placeholder="e.g. Ruang Baca Utama" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="purchaseDate">Tanggal Pembelian</Label>
              <Input id="purchaseDate" type="date" value={newPurchaseDate} onChange={(e) => setNewPurchaseDate(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label>Foto Aset (Optional)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-24 rounded border border-dashed border-border/80 hover:border-primary/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-background"
              >
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  {assetPhoto ? assetPhoto.name : "Klik untuk memilih gambar"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setAssetPhoto(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-6">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createAssetMutation.isPending || !newName}>
                {createAssetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrasi Aset
              </Button>
            </DialogFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* 5. Sheet: Asset Detail & Maintenance History */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Detail Asset Inventaris</SheetTitle>
            <SheetDescription>Tinjau parameter spesifikasi, pemeliharaan rutin, dan log laporan kerusakan.</SheetDescription>
          </SheetHeader>

          {selectedAsset && (
            <div className="space-y-5 pt-4">
              {/* Tab Navigation */}
              <div className="flex border-b">
                {(["info", "maintenance", "damage"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-2 text-xs font-semibold border-b-2 capitalize transition-colors ${
                      activeTab === t
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "info" ? "Informasi" : t === "maintenance" ? "Pemeliharaan" : "Kerusakan"}
                  </button>
                ))}
              </div>

              {/* Tab: Info */}
              {activeTab === "info" && (
                <div className="space-y-4 text-xs">
                  <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-muted/20">
                    <div className="h-32 w-32 rounded bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center justify-center text-indigo-500 shadow-inner">
                      {selectedAsset.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedAsset.photo_url} alt={selectedAsset.name} className="h-full w-full object-cover rounded" />
                      ) : (
                        <>
                          <Package className="h-10 w-10 mb-1" />
                          <span className="text-[10px]">TIDAK ADA FOTO</span>
                        </>
                      )}
                    </div>
                    <div className="text-center">
                      <h4 className="font-extrabold text-sm text-foreground">{selectedAsset.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{selectedAsset.asset_code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-background/50">
                    <div>
                      <span className="block text-muted-foreground font-medium">Kategori Aset</span>
                      <span className="font-bold text-foreground text-sm">{CATEGORIES[selectedAsset.category]}</span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground font-medium">Lokasi</span>
                      <span className="font-bold text-foreground text-sm">{selectedAsset.location || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground font-medium">Tanggal Pembelian</span>
                      <span className="font-semibold text-foreground text-sm">{selectedAsset.purchase_date || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground font-medium">Kondisi Fisik</span>
                      <span className="font-semibold text-foreground text-sm capitalize">{selectedAsset.condition.replace("_", " ")}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMaintOpen(true)} className="flex-1 gap-1 text-[11px]">
                      <Wrench className="h-3.5 w-3.5" /> Log Pemeliharaan
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDamageOpen(true)} className="flex-1 gap-1 text-[11px] text-destructive border-destructive/20 hover:bg-destructive/5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Laporkan Kerusakan
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab: Maintenance Logs */}
              {activeTab === "maintenance" && (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-foreground">Log Pemeliharaan Preventif</h4>
                    <Button size="sm" onClick={() => setMaintOpen(true)} className="h-7 text-[10px] gap-1">
                      <Plus className="h-3 w-3" /> Catat Pemeliharaan
                    </Button>
                  </div>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat data...
                    </div>
                  ) : maintenanceLogs.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                      {maintenanceLogs.map((log) => (
                        <div key={log.id} className="p-3 border rounded-lg bg-background/50 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {log.maintenance_date}</span>
                            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                              <DollarSign className="h-3 w-3" /> Cost: Rp {log.cost.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="font-semibold text-foreground text-xs leading-normal">{log.details}</p>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t pt-1.5 mt-1">
                            <span>Teknisi: {log.performed_by || "Vendor"}</span>
                            {log.next_maintenance_date && (
                              <span className="font-bold">Next: {log.next_maintenance_date}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                      <Wrench className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <span>Belum ada catatan pemeliharaan</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Damage Reports & Repairs */}
              {activeTab === "damage" && (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-foreground">Log Laporan Kerusakan</h4>
                    <Button size="sm" onClick={() => setDamageOpen(true)} className="h-7 text-[10px] gap-1 text-destructive border-destructive/20 hover:bg-destructive/5" variant="outline">
                      <Plus className="h-3 w-3" /> Laporkan Kerusakan
                    </Button>
                  </div>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat data...
                    </div>
                  ) : damageReports.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                      {damageReports.map((rep) => {
                        const style =
                          rep.status === "selesai"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : rep.status === "perbaikan"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20";
                        return (
                          <div key={rep.id} className="p-3 border rounded-lg bg-background/50 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>Tgl Lapor: {rep.report_date}</span>
                              <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold border capitalize ${style}`}>
                                {rep.status}
                              </span>
                            </div>
                            <p className="font-semibold text-foreground text-xs leading-normal italic">&ldquo;{rep.description}&rdquo;</p>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t pt-1.5 mt-1">
                              <span>Pelapor: {rep.profiles?.full_name}</span>
                              {rep.status !== "selesai" && (
                                <button
                                  onClick={() => handleOpenRepair(rep)}
                                  className="text-primary font-bold hover:underline"
                                >
                                  Proses Perbaikan &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                      <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <span>Belum ada laporan kerusakan</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 6. Dialog: Log Maintenance */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Catat Pemeliharaan Rutin</DialogTitle>
            <DialogDescription>Tambahkan log pemeliharaan preventif berkala untuk aset.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="maintDate">Tanggal Pemeliharaan</Label>
              <Input id="maintDate" type="date" value={maintDate} onChange={(e) => setMaintDate(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="maintDet">Rincian Pemeliharaan</Label>
              <textarea
                id="maintDet"
                placeholder="Rincian pelumasan engsel, pembersihan debu, instal ulang OS..."
                value={maintDetails}
                onChange={(e) => setMaintDetails(e.target.value)}
                className="min-h-16 w-full rounded border p-2 bg-background focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="maintCost">Biaya Pemeliharaan (Rp)</Label>
                <Input id="maintCost" type="number" value={maintCost} onChange={(e) => setMaintCost(parseInt(e.target.value) || 0)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="maintPerf">Teknisi / Perusahaan</Label>
                <Input id="maintPerf" placeholder="e.g. IT Staff / CV Maju" value={maintPerformedBy} onChange={(e) => setMaintPerformedBy(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="maintNext">Jadwal Pemeliharaan Berikutnya (Optional)</Label>
              <Input id="maintNext" type="date" value={maintNextDate} onChange={(e) => setMaintNextDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => logMaintMutation.mutate()} disabled={logMaintMutation.isPending || !maintDetails}>
              {logMaintMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Dialog: Log Damage Report */}
      <Dialog open={damageOpen} onOpenChange={setDamageOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5" /> Laporkan Kerusakan Aset
            </DialogTitle>
            <DialogDescription>Laporkan kelainan kondisi prasarana inventaris sekolah.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="damageSeverity">Tingkat Kerusakan</Label>
              <Select value={damageSeverity} onValueChange={(val: "rusak_ringan" | "rusak_berat") => setDamageSeverity(val)}>
                <SelectTrigger id="damageSeverity">
                  <SelectValue placeholder="Pilih Tingkat Kerusakan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rusak_ringan">Rusak Ringan (Aset masih bisa beroperasi terbatas)</SelectItem>
                  <SelectItem value="rusak_berat">Rusak Berat (Aset mati total / tidak bisa dipakai)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="damageDesc">Keterangan / Rincian Kerusakan</Label>
              <textarea
                id="damageDesc"
                placeholder="Rincian monitor pecah, kaki kursi patah, printer paper jam kronis..."
                value={damageDesc}
                onChange={(e) => setDamageDesc(e.target.value)}
                className="min-h-20 w-full rounded border p-2 bg-background focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDamageOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => createDamageMutation.mutate()} disabled={createDamageMutation.isPending || !damageDesc}>
              {createDamageMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Kirim Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Dialog: Log Repair */}
      <Dialog open={repairOpen} onOpenChange={setRepairOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Catat Tindakan Perbaikan</DialogTitle>
            <DialogDescription>Simpan tindakan servis / perbaikan untuk laporan kerusakan terpilih.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedReport && (
              <div className="p-3 rounded bg-muted/40 border">
                <p className="font-semibold">Keluhan Laporan:</p>
                <p className="italic font-medium mt-0.5">&ldquo;{selectedReport.description}&rdquo;</p>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="repairDet">Tindakan Perbaikan</Label>
              <textarea
                id="repairDet"
                placeholder="Melakukan solder ulang kabel, penggantian cartridge tinta printer..."
                value={repairDetails}
                onChange={(e) => setRepairDetails(e.target.value)}
                className="min-h-16 w-full rounded border p-2 bg-background focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="repairCost">Biaya Perbaikan (Rp)</Label>
                <Input id="repairCost" type="number" value={repairCost} onChange={(e) => setRepairCost(parseInt(e.target.value) || 0)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repairPerf">Teknisi Servis</Label>
                <Input id="repairPerf" placeholder="e.g. CV Service Solusi" value={repairPerformedBy} onChange={(e) => setRepairPerformedBy(e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold mt-2">
              <input
                type="checkbox"
                checked={markResolved}
                onChange={(e) => setMarkResolved(e.target.checked)}
                className="rounded border text-primary"
              />
              <span>Tandai selesai & pulihkan kondisi Aset ke &ldquo;Baik&rdquo;</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => logRepairMutation.mutate()} disabled={logRepairMutation.isPending || !repairDetails}>
              {logRepairMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Simpan Catatan Perbaikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Dialog: Delete Asset */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5" /> Hapus Aset dari Inventaris?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini bersifat permanen. Menghapus aset &ldquo;<span className="font-bold text-foreground">{selectedAsset?.name}</span>&rdquo; akan membersihkan semua histori pemeliharaan dan kerusakan terkait.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (selectedAsset) deleteAssetMutation.mutate(selectedAsset.id); }}
              disabled={deleteAssetMutation.isPending}
            >
              {deleteAssetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Aset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
