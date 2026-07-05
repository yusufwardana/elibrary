"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  AlertCircle,
  Download,
  Calendar,
  MessageSquare,
  FileText,
  User,
  Loader2,
  History,
  Printer,
  BookOpen,
  ArrowLeftRight,
  Package,
  Users,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getAccreditationOverview,
  getCategoryRequirements,
  getSubmissionVersionsList,
  uploadEvidenceAction,
  saveAssessorCommentAction,
} from "./actions";
import { AccreditationOverview, AccreditationRequirement, SubmissionVersion, AccreditationSubmission } from "./types";

interface AccreditationClientProps {
  initialOverview: AccreditationOverview;
  currentUserRole: string;
  profileName: string;
  profileRole: string;
}

// Icon mapper for the 8 categories
const CATEGORY_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  0: Award,        // 1. Administrasi
  1: BookOpen,     // 2. Koleksi
  2: ArrowLeftRight, // 3. Pengelolaan
  3: Package,      // 4. Sarana
  4: Users,        // 5. Layanan
  5: Trophy,       // 6. Literasi
  6: User,         // 7. Tenaga
  7: FileText,     // 8. Evaluasi
};

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator Utama",
  kepala_perpustakaan: "Kepala Perpustakaan",
  petugas: "Petugas Perpustakaan",
  guru: "Guru Pembimbing",
  siswa: "Siswa Anggota",
};

export default function AccreditationClient({
  initialOverview,
  currentUserRole,
  profileName,
  profileRole,
}: AccreditationClientProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAssessorOrStaff =
    currentUserRole === "administrator" ||
    currentUserRole === "kepala_perpustakaan";

  const isLibraryStaff =
    currentUserRole === "administrator" ||
    currentUserRole === "kepala_perpustakaan" ||
    currentUserRole === "petugas";

  // Active Category Selection
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedCatName, setSelectedCatName] = useState<string>("");

  // Sheet & Dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Active requirement selection
  const [selectedReq, setSelectedReq] = useState<AccreditationRequirement | null>(null);

  // Upload Form states
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Assessor Review Form states
  const [reviewComments, setReviewComments] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"draft" | "review" | "disetujui" | "arsip">("review");

  // Version history state
  const [versionsList, setVersionsList] = useState<SubmissionVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Queries
  const { data: overview } = useQuery<AccreditationOverview>({
    queryKey: ["accreditation-overview"],
    queryFn: getAccreditationOverview,
    initialData: initialOverview,
  });

  const { data: requirements, isLoading: loadingReqs } = useQuery<AccreditationRequirement[]>({
    queryKey: ["category-requirements", selectedCatId],
    queryFn: () => getCategoryRequirements(selectedCatId || ""),
    enabled: !!selectedCatId,
  });

  // Mutations
  const uploadEvidenceMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("requirement_id", selectedReq?.id || "");
      fd.append("notes", uploadNotes);
      if (uploadFile) fd.append("file", uploadFile);
      return uploadEvidenceAction(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accreditation-overview"] });
      queryClient.invalidateQueries({ queryKey: ["category-requirements", selectedCatId] });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadNotes("");
      toast.success("Berkas bukti akreditasi berhasil diunggah");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mengunggah berkas");
    },
  });

  const saveReviewMutation = useMutation({
    mutationFn: () =>
      saveAssessorCommentAction(selectedReq?.accreditation_submissions?.id || "", reviewComments, reviewStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accreditation-overview"] });
      queryClient.invalidateQueries({ queryKey: ["category-requirements", selectedCatId] });
      setReviewOpen(false);
      setReviewComments("");
      toast.success("Catatan penilaian asesor berhasil disimpan");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal menyimpan ulasan");
    },
  });

  const handleOpenVersions = useCallback(async (sub: AccreditationSubmission) => {
    setSelectedReq(null);
    setVersionOpen(true);
    setLoadingVersions(true);
    try {
      const list = await getSubmissionVersionsList(sub.id);
      setVersionsList(list);
    } catch {
      toast.error("Gagal memuat log riwayat versi berkas");
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  const handleExportCSV = () => {
    const headers = ["Standar SNP", "Dokumen Dipersyaratkan", "Status Kepatuhan", "Penyetor", "Catatan Asesor"];
    const rows = (requirements || []).map((r) => [
      selectedCatName,
      `"${r.document_name}"`,
      r.accreditation_submissions?.status === "disetujui" ? "Selesai / Approved" : r.accreditation_submissions ? "Draft / Review" : "Missing / Belum Ada",
      `"${r.accreditation_submissions?.profiles?.full_name || "-"}"`,
      `"${(r.accreditation_submissions?.assessor_comments || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Kepatuhan_SNP_${selectedCatName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan checklist SNP berhasil diunduh");
  };

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall complete percentage rate */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Kesiapan Akreditasi SNP</CardTitle>
            <CardDescription>Persentase pemenuhan kelengkapan dokumen standar nasional perpustakaan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-extrabold text-foreground">{overview.overallPercentage}%</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase">
                {overview.overallPercentage === 100 ? "Akreditasi A" : "Menuju Akreditasi"}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden border">
              <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${overview.overallPercentage}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Missing evidence counter */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Belum Lengkap</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-destructive">{overview.missingEvidenceCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Dokumen belum disetujui</p>
          </CardContent>
        </Card>

        {/* Quick Report printing card */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Laporan Kesiapan</CardTitle>
            <CardDescription>Cetak ringkasan portofolio akreditasi</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button size="sm" onClick={() => setPrintOpen(true)} className="w-full gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" />
              Cetak Laporan SNP
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Grid of the 8 SNP Categories */}
      <div className="space-y-3.5">
        <h3 className="text-sm font-bold text-foreground">8 Kategori Standar Akreditasi SNP</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overview.categoriesProgress.map((cat, idx) => {
            const Icon = CATEGORY_ICONS[idx] || Award;
            const cardStyle = selectedCatId === cat.id ? "ring-2 ring-primary border-transparent" : "border-border/50 hover:bg-card/40";
            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCatId(cat.id);
                  setSelectedCatName(cat.name);
                }}
                className={`p-4 rounded-xl border bg-card/30 shadow transition-all cursor-pointer space-y-3 flex flex-col justify-between ${cardStyle}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border flex items-center justify-center text-indigo-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold border uppercase ${
                      cat.status === "Complete" 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : cat.status === "In Progress" 
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}>
                      {cat.status === "Complete" ? "Lengkap" : cat.status === "In Progress" ? "Proses" : "Missing"}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground mt-2 line-clamp-1">{cat.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{cat.approvedCount} dari {cat.totalRequired} berkas disetujui</p>
                </div>
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                    <span>Kemajuan</span>
                    <span>{cat.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${cat.percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Category checklists & evidence uploads */}
      {selectedCatId && (
        <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <CardTitle>{selectedCatName}</CardTitle>
              <CardDescription>Checklist kelengkapan berkas fisik standar akreditasi SNP</CardDescription>
            </div>
            {requirements && requirements.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Unduh Laporan Kategori
              </Button>
            )}
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {loadingReqs ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat data checklist...
              </div>
            ) : requirements && requirements.length > 0 ? (
              <div className="rounded-lg border overflow-hidden bg-background/50 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="px-4 py-3">Persyaratan Dokumen</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Bukti Fisik</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requirements.map((req) => {
                      const sub = req.accreditation_submissions;
                      const status = sub?.status || "missing";
                      const statusStyle =
                        status === "disetujui"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : status === "review"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : status === "draft"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20";

                      return (
                        <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 space-y-0.5 max-w-xs">
                            <span className="font-bold text-foreground block">{req.document_name}</span>
                            <span className="text-[10px] text-muted-foreground leading-normal block italic">{req.description}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded px-2 py-0.5 text-[8px] font-bold border uppercase ${statusStyle}`}>
                              {status === "disetujui" ? "Disetujui" : status === "review" ? "Review" : status === "draft" ? "Draft" : "Missing"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {sub ? (
                              <div className="flex flex-col gap-1">
                                <a
                                  href={sub.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary font-semibold hover:underline flex items-center gap-1 leading-none"
                                >
                                  <FileText className="h-3.5 w-3.5" /> {sub.file_name.slice(0, 20)}...
                                </a>
                                <span className="text-[9px] text-muted-foreground font-mono">
                                  Versi: v{sub.version} &bull; Oleh: {sub.profiles?.full_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Belum dilampirkan</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isLibraryStaff && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedReq(req);
                                    setUploadOpen(true);
                                  }}
                                  className="h-7 text-[10px]"
                                >
                                  {sub ? "Revisi" : "Unggah"}
                                </Button>
                              )}
                              {sub && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleOpenVersions(sub)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Versi History"
                                  >
                                    <History className="h-3.5 w-3.5" />
                                  </Button>
                                  {isAssessorOrStaff && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReq(req);
                                        setReviewComments(sub.assessor_comments || "");
                                        setReviewStatus(sub.status);
                                        setReviewOpen(true);
                                      }}
                                      className="h-7 text-[10px] gap-1"
                                    >
                                      <MessageSquare className="h-3 w-3" /> Review
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <span>Belum ada dokumen yang dikonfigurasi</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline of document uploads */}
      <Card className="border-border/50 bg-card/20 backdrop-blur-md shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Riwayat Unggahan Dokumen Kepatuhan SNP</CardTitle>
          <CardDescription>Timeline pembaharuan bukti evidence akreditasi sekolah</CardDescription>
        </CardHeader>
        <CardContent className="max-h-52 overflow-y-auto pr-1">
          {overview.timeline.length > 0 ? (
            <div className="space-y-3.5 text-xs">
              {overview.timeline.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2.5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px]">
                      V{item.version}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.document_name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.category_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[10px] text-foreground">Oleh: {item.uploaded_by}</div>
                    <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <span>Belum ada aktivitas dokumen masuk</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Sheet: Upload Evidence Supporting Document */}
      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Unggah Berkas Bukti Akreditasi</SheetTitle>
            <SheetDescription>Daftarkan berkas evidence fisik untuk pemenuhan kelayakan SNP.</SheetDescription>
          </SheetHeader>

          {selectedReq && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadEvidenceMutation.mutate();
              }}
              className="space-y-4 pt-5 text-xs"
            >
              <div className="p-3 border rounded bg-muted/20">
                <span className="block font-bold text-foreground text-xs">{selectedReq.document_name}</span>
                <span className="block text-[10px] text-muted-foreground leading-normal mt-0.5">{selectedReq.description}</span>
              </div>

              <div className="grid gap-1.5">
                <Label>Pilih Berkas Bukti (PDF / JPG)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 rounded border border-dashed hover:border-primary/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-background"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-bold">
                    {uploadFile ? uploadFile.name : "Klik untuk memilih file PDF"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="uploadNotes">Catatan Tambahan (Optional)</Label>
                <textarea
                  id="uploadNotes"
                  placeholder="e.g. Nomor SK: 104/SK-PERPUS/2026, ditandatangani per Juni..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="min-h-16 w-full rounded border p-2 bg-background focus:outline-none"
                />
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-6">
                <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={uploadEvidenceMutation.isPending || !uploadFile}>
                  {uploadEvidenceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Unggah Bukti Fisik
                </Button>
              </DialogFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. Dialog: Assessor Review comments */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Penilaian Asesor Akreditasi</DialogTitle>
            <DialogDescription>Review kelayakan berkas fisik akreditasi dan setujui status.</DialogDescription>
          </DialogHeader>

          {selectedReq && selectedReq.accreditation_submissions && (
            <div className="space-y-4 py-2">
              <div className="p-3 border rounded bg-muted/20 space-y-1">
                <p>Dokumen: <span className="font-bold">{selectedReq.document_name}</span></p>
                <a
                  href={selectedReq.accreditation_submissions.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold hover:underline block"
                >
                  Lihat Berkas Terunggah &rarr;
                </a>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="reviewStatus">Status Keputusan</Label>
                <Select value={reviewStatus} onValueChange={(val: "draft" | "review" | "disetujui" | "arsip") => setReviewStatus(val)}>
                  <SelectTrigger id="reviewStatus">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disetujui">Disetujui (Approved)</SelectItem>
                    <SelectItem value="review">Butuh Revisi / Review</SelectItem>
                    <SelectItem value="draft">Tolak & Jadikan Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="reviewComments">Catatan / Ulasan Asesor</Label>
                <textarea
                  id="reviewComments"
                  placeholder="e.g. Berkas sudah lengkap dan sesuai. Tanda tangan basah terverifikasi."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="min-h-20 w-full rounded border p-2 bg-background focus:outline-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => saveReviewMutation.mutate()} disabled={saveReviewMutation.isPending}>
              {saveReviewMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Simpan Hasil Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Sheet: Version history drawer */}
      <Sheet open={versionOpen} onOpenChange={setVersionOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Log Riwayat Versi Dokumen</SheetTitle>
            <SheetDescription>Tinjau audit log revision berkas bukti fisik akreditasi.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-5 text-xs">
            {loadingVersions ? (
              <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat versi...
              </div>
            ) : versionsList.length > 0 ? (
              <div className="space-y-3.5">
                {versionsList.map((ver) => (
                  <div key={ver.id} className="p-3 border rounded-lg bg-background/50 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                      <span className="bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        Versi v{ver.version}
                      </span>
                      <span>
                        {new Date(ver.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <a
                        href={ver.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold hover:underline block"
                      >
                        {ver.file_name.slice(0, 25)}...
                      </a>
                      <span className="text-[9px] text-muted-foreground">Oleh: {ver.profiles?.full_name}</span>
                    </div>
                    {ver.notes && (
                      <p className="italic text-muted-foreground text-[10px] leading-relaxed border-t pt-1.5 mt-1.5">
                        &ldquo;{ver.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                <History className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <span>Belum ada log revisi terdokumentasi</span>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 7. Dialog: Printable accreditation report sheet */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-8 text-xs font-serif leading-relaxed text-black bg-white">
          <DialogHeader className="border-b-2 border-black pb-4 text-center">
            <h2 className="text-xl font-extrabold uppercase tracking-wide">Laporan Kelayakan Akreditasi Perpustakaan</h2>
            <p className="text-xs italic uppercase tracking-wider font-semibold">Standar Nasional Perpustakaan (SNP) &bull; eLibrary System</p>
          </DialogHeader>

          <div className="space-y-6 pt-5">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <p><span className="font-bold">Tanggal Cetak:</span> {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p><span className="font-bold">Total Kategori SNP:</span> 8 Kategori Standar</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold">Skor Pemenuhan:</span> {overview.overallPercentage}% Lengkap</p>
                <p><span className="font-bold">Status Evaluasi:</span> {overview.overallPercentage === 100 ? "Memenuhi Syarat A" : "Belum Lengkap"}</p>
              </div>
            </div>

            {/* List categories progress */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm border-b border-black pb-1 uppercase font-sans">Rekapitulasi Kategori Akreditasi</h3>
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-black text-slate-700 font-bold">
                    <th className="py-2">Nama Kategori Standar SNP</th>
                    <th className="py-2">Total Dokumen</th>
                    <th className="py-2 text-right">Progress (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {overview.categoriesProgress.map((cat) => (
                    <tr key={cat.id}>
                      <td className="py-2 font-semibold">{cat.name}</td>
                      <td className="py-2">{cat.approvedCount} dari {cat.totalRequired} berkas</td>
                      <td className="py-2 text-right font-bold">{cat.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Assessor notes signature area */}
            <div className="pt-10 flex justify-between items-center font-sans text-xs">
              <div className="text-center w-48">
                <p>Kepala Perpustakaan,</p>
                <div className="h-16" />
                <p className="border-t border-black pt-1 font-bold">{profileName}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[profileRole]}</p>
              </div>
              <div className="text-center w-48">
                <p>Asesor Akreditasi,</p>
                <div className="h-16" />
                <p className="border-t border-black pt-1 font-bold">____________________</p>
                <p className="text-[10px] text-muted-foreground">NIP. _________________</p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-300 pt-6 mt-6 print:hidden">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>
              Tutup
            </Button>
            <Button onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Cetak Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
