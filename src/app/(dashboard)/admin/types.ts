export type DocumentCategory =
  | "sk_kepsek"
  | "sk_kapus"
  | "tugas_staf"
  | "visi"
  | "misi"
  | "rencana_tahunan"
  | "sop"
  | "peraturan"
  | "struktur_org"
  | "tata_letak"
  | "jadwal_layanan";

export interface AdminDocument {
  id: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  version: number;
  status: "draft" | "review" | "disetujui" | "arsip";
  is_archived: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}

export interface CategoryMetadata {
  key: DocumentCategory;
  label: string;
  description: string;
  requiredForAccreditation: boolean;
}

export interface AccreditationProgress {
  completedCount: number;
  totalRequired: number;
  percentage: number;
}
