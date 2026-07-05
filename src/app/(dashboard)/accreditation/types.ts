export interface AccreditationCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface AccreditationRequirement {
  id: string;
  category_id: string;
  document_name: string;
  description: string | null;
  is_required: boolean;
  created_at: string;
  accreditation_submissions?: AccreditationSubmission | null;
}

export interface AccreditationSubmission {
  id: string;
  requirement_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  version: number;
  status: "draft" | "review" | "disetujui" | "arsip";
  notes: string | null;
  assessor_comments: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export interface SubmissionVersion {
  id: string;
  submission_id: string;
  version: number;
  file_url: string;
  file_name: string;
  file_size: number;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}

export interface AccreditationOverview {
  overallPercentage: number;
  categoriesProgress: Array<{
    id: string;
    name: string;
    totalRequired: number;
    approvedCount: number;
    percentage: number;
    status: "Complete" | "In Progress" | "Missing";
  }>;
  missingEvidenceCount: number;
  timeline: Array<{
    id: string;
    document_name: string;
    category_name: string;
    uploaded_by: string;
    created_at: string;
    version: number;
  }>;
}
