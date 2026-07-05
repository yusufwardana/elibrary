"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileCheck,
  Upload,
  Download,
  Eye,
  History,
  Archive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
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
  getDocumentsList,
  getArchivedDocuments,
  getDocumentVersions,
  uploadDocumentAction,
  uploadNewVersionAction,
  updateDocumentStatusAction,
  archiveDocumentAction,
} from "./actions";
import { AdminDocument, DocumentCategory, CategoryMetadata, DocumentVersion } from "./types";

interface AdminClientProps {
  initialDocuments: AdminDocument[];
  initialArchived: AdminDocument[];
  currentUserRole: string;
}

const CATEGORIES: CategoryMetadata[] = [
  { key: "sk_kepsek", label: "SK Kepala Sekolah", description: "Surat Keputusan pendirian perpustakaan oleh Kepala Sekolah", requiredForAccreditation: true },
  { key: "sk_kapus", label: "SK Kepala Perpustakaan", description: "SK pengangkatan Kepala Perpustakaan sekolah", requiredForAccreditation: true },
  { key: "tugas_staf", label: "SK Pembagian Tugas Staf", description: "Rincian tugas pokok dan fungsi pustakawan & tenaga teknis", requiredForAccreditation: true },
  { key: "visi", label: "Visi Perpustakaan", description: "Pernyataan visi tertulis perpustakaan sekolah", requiredForAccreditation: true },
  { key: "misi", label: "Misi Perpustakaan", description: "Pernyataan misi tertulis perpustakaan sekolah", requiredForAccreditation: true },
  { key: "rencana_tahunan", label: "Rencana Kerja Tahunan", description: "Program kerja tahunan dan rencana anggaran belanja", requiredForAccreditation: true },
  { key: "sop", label: "SOP Perpustakaan", description: "Standar Operasional Prosedur pengolahan dan layanan", requiredForAccreditation: true },
  { key: "peraturan", label: "Tata Tertib Perpustakaan", description: "Aturan kunjungan, peminjaman, dan sanksi anggota", requiredForAccreditation: true },
  { key: "struktur_org", label: "Struktur Organisasi", description: "Bagan organogram hubungan perpustakaan dengan sekolah", requiredForAccreditation: true },
  { key: "tata_letak", label: "Denah / Tata Letak Ruang", description: "Layout visual pembagian area perpustakaan", requiredForAccreditation: true },
  { key: "jadwal_layanan", label: "Jadwal Layanan", description: "Jam buka sirkulasi perpustakaan sekolah", requiredForAccreditation: true },
];

export default function AdminClient({
  initialDocuments,
  initialArchived,
  currentUserRole,
}: AdminClientProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  const isStaff = currentUserRole === "administrator" || currentUserRole === "kepala_perpustakaan" || currentUserRole === "petugas";

  // Dashboard Tab state
  const [showArchived, setShowArchived] = useState(false);

  // Sheets & Dialogs State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Selection states
  const [selectedDoc, setSelectedDoc] = useState<AdminDocument | null>(null);
  const [docVersions, setDocVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // New Document upload state
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("sk_kepsek");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // New Version upload state
  const [versionNotes, setVersionNotes] = useState("");
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(null);

  // Queries
  const { data: documents } = useQuery<AdminDocument[]>({
    queryKey: ["admin-documents"],
    queryFn: getDocumentsList,
    initialData: initialDocuments,
  });

  const { data: archivedDocs } = useQuery<AdminDocument[]>({
    queryKey: ["archived-documents"],
    queryFn: getArchivedDocuments,
    initialData: initialArchived,
  });

  // Calculate Accreditation Dashboard Progress Automatically
  const progress = useMemo(() => {
    let completedCount = 0;
    
    CATEGORIES.forEach((cat) => {
      // Check if there is at least one active document in this category that is approved ('disetujui')
      const isApproved = documents.some(
        (doc) => doc.category === cat.key && doc.status === "disetujui"
      );
      if (isApproved) {
        completedCount++;
      }
    });

    const totalRequired = CATEGORIES.length;
    const percentage = Math.round((completedCount / totalRequired) * 100);

    return { completedCount, totalRequired, percentage };
  }, [documents]);

  // Mutations
  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Silakan pilih berkas dokumen");
      const fd = new FormData();
      fd.append("category", uploadCategory);
      fd.append("title", uploadTitle);
      fd.append("description", uploadDesc);
      fd.append("file", selectedFile);
      return uploadDocumentAction(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
      setUploadOpen(false);
      // Reset
      setUploadTitle("");
      setUploadDesc("");
      setSelectedFile(null);
      toast.success("Dokumen administrasi berhasil diunggah ke storage");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mengunggah dokumen");
    },
  });

  const uploadVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDoc) throw new Error("Dokumen asal tidak terpilih");
      if (!selectedVersionFile) throw new Error("Silakan lampirkan berkas versi baru");
      const fd = new FormData();
      fd.append("notes", versionNotes);
      fd.append("file", selectedVersionFile);
      return uploadNewVersionAction(selectedDoc.id, fd);
    },
    onSuccess: (updatedDoc: AdminDocument) => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
      setSelectedDoc(updatedDoc);
      // Refresh version list
      fetchVersions(updatedDoc.id);
      // Reset version form
      setVersionNotes("");
      setSelectedVersionFile(null);
      if (versionFileInputRef.current) versionFileInputRef.current.value = "";
      toast.success(`Versi baru (v${updatedDoc.version}) berhasil diperbarui`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal memperbarui versi dokumen");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "review" | "disetujui" | "arsip" }) =>
      updateDocumentStatusAction(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
      toast.success("Status dokumen berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal merubah status");
    },
  });

  const archiveDocMutation = useMutation({
    mutationFn: archiveDocumentAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
      queryClient.invalidateQueries({ queryKey: ["archived-documents"] });
      toast.success("Dokumen berhasil dipindahkan ke arsip");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mengarsipkan dokumen");
    },
  });

  // Fetch Versions history helper
  const fetchVersions = async (id: string) => {
    setLoadingVersions(true);
    try {
      const data = await getDocumentVersions(id);
      setDocVersions(data);
    } catch {
      toast.error("Gagal memuat riwayat versi");
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleOpenHistory = (doc: AdminDocument) => {
    setSelectedDoc(doc);
    fetchVersions(doc.id);
    setHistoryOpen(true);
  };

  const handleOpenPreview = (doc: AdminDocument) => {
    setSelectedDoc(doc);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Accreditation Dashboard Header */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <FileCheck className="h-3.5 w-3.5" /> Akreditasi Perpustakaan Sekolah
              </div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Accreditation Progress Dashboard</h2>
              <p className="text-xs text-muted-foreground max-w-xl">
                Unggah dokumen pendukung untuk memenuhi 11 kategori administrasi wajib akreditasi. Kelola persetujuan, versioning, dan arsip dokumen.
              </p>
            </div>

            {/* Progress Circle & Meter */}
            <div className="flex items-center gap-4 border bg-background/40 backdrop-blur-sm p-4 rounded-xl shadow-inner min-w-[240px]">
              {/* Simple HSL progress percentage gauge */}
              <div className="relative h-14 w-14 shrink-0 flex items-center justify-center rounded-full bg-muted border border-border/50">
                <span className="font-extrabold text-sm text-foreground">{progress.percentage}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Kelengkapan Akreditasi</span>
                <span className="text-sm font-extrabold text-foreground">
                  {progress.completedCount} / {progress.totalRequired} Kategori
                </span>
                {/* Progress bar */}
                <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Accreditation Checklist Grid */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Persyaratan Dokumen Akreditasi</CardTitle>
          <CardDescription>Status dokumen checklist wajib standar nasional perpustakaan (SNP)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const catDocs = documents.filter((d) => d.category === cat.key);
              const approvedDoc = catDocs.find((d) => d.status === "disetujui");
              const inReviewDoc = catDocs.find((d) => d.status === "review");
              const hasDraftDoc = catDocs.find((d) => d.status === "draft");

              let statusText = "Belum Diunggah";
              let statusStyle = "text-muted-foreground bg-muted/30 border-muted-foreground/20";
              let StatusIcon = AlertCircle;

              if (approvedDoc) {
                statusText = "Disetujui (Lengkap)";
                statusStyle = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                StatusIcon = CheckCircle2;
              } else if (inReviewDoc) {
                statusText = "Butuh Review";
                statusStyle = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
                StatusIcon = Clock;
              } else if (hasDraftDoc) {
                statusText = "Draft";
                statusStyle = "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                StatusIcon = FileText;
              }

              return (
                <div key={cat.key} className="flex flex-col justify-between p-3.5 rounded-lg border border-border/50 bg-background/30 hover:border-indigo-500/20 transition-all group shadow-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {cat.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize ${statusStyle}`}>
                        <StatusIcon className="h-2.5 w-2.5" /> {statusText}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  {catDocs.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2.5 text-[10px]">
                      <span className="text-muted-foreground">v{catDocs[0].version} — {catDocs[0].file_name.slice(-15)}</span>
                      <button
                        onClick={() => handleOpenPreview(catDocs[0])}
                        className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        Kelola Dokumen <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Document Administration Files Card */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{showArchived ? "Arsip Dokumen Administrasi" : "Dokumen Administrasi Aktif"}</CardTitle>
            <CardDescription>
              {showArchived
                ? "Daftar dokumen kadaluwarsa atau dinonaktifkan"
                : "Semua dokumen kelengkapan berkas aktif dan draft"}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Archive button */}
            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="gap-2 text-xs">
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? "Lihat Dokumen Aktif" : "Lihat Arsip"}
            </Button>

            {/* Upload Button */}
            {isStaff && (
              <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-2 text-xs">
                <Upload className="h-4 w-4" />
                Unggah Dokumen Baru
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Files List Layout */}
          <div className="space-y-3">
            {(showArchived ? archivedDocs : documents).length > 0 ? (
              (showArchived ? archivedDocs : documents).map((doc) => {
                const sizeInKb = Math.round(doc.file_size / 102.4) / 10;
                const uploadDate = new Date(doc.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                
                // Get corresponding label
                const label = CATEGORIES.find(c => c.key === doc.category)?.label || doc.category;

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col min-w-0 space-y-0.5">
                        <h4 className="font-semibold text-foreground text-sm truncate">{doc.title}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-[9px] uppercase border">
                            {label}
                          </span>
                          <span>•</span>
                          <span>v{doc.version}</span>
                          <span>•</span>
                          <span>{sizeInKb} KB</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" /> {uploadDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenPreview(doc)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleOpenHistory(doc)} className="h-8 w-8 text-muted-foreground hover:text-indigo-500">
                        <History className="h-4 w-4" />
                      </Button>
                      <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-emerald-500">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground bg-muted/5">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-foreground">Tidak ada berkas dokumen</p>
                <p className="text-xs mt-1">Gunakan tombol &apos;Unggah Dokumen Baru&apos; untuk mulai melengkapi administrasi.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Sheet: Upload Document Form */}
      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Unggah Berkas Baru</SheetTitle>
            <SheetDescription>Simpan berkas kelengkapan administrasi akreditasi ke dalam Supabase Storage.</SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              uploadDocMutation.mutate();
            }}
            className="space-y-4 pt-5"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="category">Kategori Persyaratan</Label>
              <Select value={uploadCategory} onValueChange={(val: DocumentCategory) => setUploadCategory(val)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="title">Judul Dokumen</Label>
              <Input
                id="title"
                placeholder="e.g. SK Kepala Sekolah Pendirian Perpustakaan"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="desc">Deskripsi Dokumen (Optional)</Label>
              <textarea
                id="desc"
                placeholder="Keterangan isi SK atau catatan berkas..."
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="min-h-20 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Lampiran Berkas (PDF / Image / Doc)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-28 rounded-lg border border-dashed border-border/80 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-background/50 shadow-inner"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedFile ? selectedFile.name : "Klik untuk memilih file"}
                </span>
                <span className="text-[10px] text-muted-foreground/60">PDF, PNG, JPG maks 5MB</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-6">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={uploadDocMutation.isPending || !uploadTitle || !selectedFile}>
                {uploadDocMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unggah Berkas
              </Button>
            </DialogFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* 5. Sheet: Manage Document & Version History */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Riwayat Versi Dokumen</SheetTitle>
            <SheetDescription>Unggah revisi file versi baru dan tinjau catatan log riwayat.</SheetDescription>
          </SheetHeader>

          {selectedDoc && (
            <div className="space-y-6 pt-5">
              {/* Current Details Info */}
              <div className="p-3.5 rounded-lg border bg-muted/30 space-y-1 text-xs">
                <h4 className="font-bold text-sm text-foreground">{selectedDoc.title}</h4>
                <p className="text-muted-foreground">Kategori: {CATEGORIES.find(c => c.key === selectedDoc.category)?.label}</p>
                <p className="text-muted-foreground">Status Aktif: <span className="font-semibold text-primary capitalize">{selectedDoc.status}</span></p>
                <p className="text-muted-foreground">Versi Terkini: <span className="font-semibold">v{selectedDoc.version}</span></p>
              </div>

              {/* Version History Log */}
              <div className="space-y-3.5">
                <h4 className="font-bold text-xs text-foreground">Log Versi Berkas</h4>
                {loadingVersions ? (
                  <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat versi...
                  </div>
                ) : docVersions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {docVersions.map((v) => (
                      <div key={v.id} className="flex justify-between items-start gap-4 p-2.5 rounded border border-border/40 bg-background/50 text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">Versi {v.version}</p>
                          <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                            {v.notes || "Tidak ada catatan versi"}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(v.created_at).toLocaleString()}
                          </p>
                        </div>
                        <a href={v.file_url} download={v.file_name} target="_blank" rel="noreferrer" className="shrink-0 text-primary font-bold hover:underline text-[10px] flex items-center gap-0.5">
                          Unduh <Download className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-xs text-muted-foreground">
                    Tidak ada riwayat versi
                  </div>
                )}
              </div>

              {/* Upload New Version Area */}
              {isStaff && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    uploadVersionMutation.mutate();
                  }}
                  className="space-y-3 border-t pt-4"
                >
                  <h4 className="font-bold text-xs text-foreground">Unggah Versi Revisi Baru</h4>

                  <div className="grid gap-1.5">
                    <Label htmlFor="versionNotes">Catatan Revisi / Pembaruan</Label>
                    <Input
                      id="versionNotes"
                      placeholder="e.g. Pembaharuan SK tgl 05 Juli 2026"
                      value={versionNotes}
                      onChange={(e) => setVersionNotes(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Pilih Berkas Versi Baru</Label>
                    <div
                      onClick={() => versionFileInputRef.current?.click()}
                      className="h-16 rounded border border-dashed border-border/80 hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-background"
                    >
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                        {selectedVersionFile ? selectedVersionFile.name : "Pilih file revisi"}
                      </span>
                    </div>
                    <input
                      ref={versionFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setSelectedVersionFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>

                  <Button type="submit" size="sm" className="w-full" disabled={uploadVersionMutation.isPending || !selectedVersionFile}>
                    {uploadVersionMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Kirim Versi Revisi
                  </Button>
                </form>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 6. Document Preview and Action Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Tinjau Dokumen Administrasi</DialogTitle>
            <DialogDescription>Preview berkas, perbarui status persetujuan akreditasi, atau pindahkan dokumen ke arsip.</DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="grid gap-6 md:grid-cols-3 py-2 text-xs">
              {/* Left frame preview */}
              <div className="md:col-span-2 space-y-4">
                <div className="h-72 w-full rounded-lg bg-slate-900 border border-slate-700/50 flex flex-col items-center justify-center text-white/50 relative shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
                  <FileText className="h-16 w-16 mb-2 text-white/20" />
                  <span className="font-semibold text-xs tracking-tight text-white/70">{selectedDoc.file_name}</span>
                  <span className="text-[10px] text-white/40 mt-1">Ukuran berkas: {Math.round(selectedDoc.file_size / 102.4) / 10} KB</span>
                  
                  <a href={selectedDoc.file_url} target="_blank" rel="noreferrer" className="mt-4">
                    <Button size="sm" variant="secondary" className="gap-2 text-[10px]">
                      Buka di Tab Baru <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Right config sidebar */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="block font-bold text-foreground">Detail Dokumen</span>
                  <h3 className="text-sm font-semibold text-primary">{selectedDoc.title}</h3>
                  <p className="text-muted-foreground italic leading-normal">
                    &ldquo;{selectedDoc.description || "Tidak ada rincian deskripsi"}&rdquo;
                  </p>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <span className="block font-bold text-foreground">Status Kelayakan</span>
                  
                  <div className="flex flex-col gap-2">
                    {/* Approve status buttons for staff */}
                    {isStaff ? (
                      <div className="space-y-2">
                        <Label htmlFor="docStatus">Status Approval</Label>
                        <Select
                          value={selectedDoc.status}
                          onValueChange={(val: "draft" | "review" | "disetujui") =>
                            updateStatusMutation.mutate({ id: selectedDoc.id, status: val })
                          }
                        >
                          <SelectTrigger id="docStatus">
                            <SelectValue placeholder="Pilih Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft (Konsep)</SelectItem>
                            <SelectItem value="review">Butuh Review</SelectItem>
                            <SelectItem value="disetujui">Disetujui (Accreditation Ready)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 font-semibold text-primary uppercase w-max">
                        {selectedDoc.status}
                      </span>
                    )}

                    {/* Archive document */}
                    {isStaff && !selectedDoc.is_archived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          archiveDocMutation.mutate(selectedDoc.id);
                          setPreviewOpen(false);
                        }}
                        className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5"
                      >
                        <Archive className="h-3.5 w-3.5" /> Pindahkan Ke Arsip
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expiry / Acc warning */}
                <div className="border-t pt-3 flex items-start gap-2 text-[10px] text-muted-foreground leading-normal">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                  <p>
                    Dokumen pendukung yang disetujui (Approved) akan otomatis terhitung pada indikator kelayakan akreditasi.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setPreviewOpen(false)}>Tutup Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
