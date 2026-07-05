"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AccreditationOverview, AccreditationRequirement, AccreditationSubmission, SubmissionVersion } from "./types";

// Get overall accreditation progress and metrics
export async function getAccreditationOverview(): Promise<AccreditationOverview> {
  const supabase = await createClient();

  // 1. Fetch categories
  const { data: categories, error: catError } = await supabase
    .from("accreditation_categories")
    .select("*")
    .order("name", { ascending: true });

  if (catError) throw new Error(catError.message);

  // 2. Fetch requirements and their submissions in parallel
  const { data: requirements, error: reqError } = await supabase
    .from("accreditation_requirements")
    .select(`
      *,
      accreditation_submissions (
        id,
        status,
        created_at,
        version,
        uploaded_by,
        profiles (full_name)
      )
    `);

  if (reqError) throw new Error(reqError.message);

  const reqs = requirements || [];
  const totalRequired = reqs.length;
  
  // Calculate category progress
  const categoriesProgress = (categories || []).map((cat) => {
    const catReqs = reqs.filter((r) => r.category_id === cat.id);
    const approvedCount = catReqs.filter(
      (r) => r.accreditation_submissions?.status === "disetujui"
    ).length;
    const catTotal = catReqs.length;
    const percentage = catTotal > 0 ? Math.round((approvedCount / catTotal) * 100) : 0;
    
    let status: "Complete" | "In Progress" | "Missing" = "Missing";
    if (percentage === 100) status = "Complete";
    else if (percentage > 0) status = "In Progress";

    return {
      id: cat.id,
      name: cat.name,
      totalRequired: catTotal,
      approvedCount,
      percentage,
      status,
    };
  });

  const overallApproved = reqs.filter(
    (r) => r.accreditation_submissions?.status === "disetujui"
  ).length;
  const overallPercentage = totalRequired > 0 ? Math.round((overallApproved / totalRequired) * 100) : 0;
  
  // Missing evidence count: total required requirements that don't have an approved submission
  const missingEvidenceCount = totalRequired - overallApproved;

  // Build timeline of uploads (last 10 uploads)
  const timelineData = reqs
    .filter((r) => r.accreditation_submissions)
    .map((r) => {
      const sub = r.accreditation_submissions!;
      const cat = categories?.find((c) => c.id === r.category_id);
      return {
        id: sub.id,
        document_name: r.document_name,
        category_name: cat?.name || "Kategori",
        uploaded_by: (sub.profiles as { full_name: string } | null)?.full_name || "Staf",
        created_at: sub.created_at,
        version: sub.version,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return {
    overallPercentage,
    categoriesProgress,
    missingEvidenceCount,
    timeline: timelineData,
  };
}

// Fetch requirements list for a specific category ID
export async function getCategoryRequirements(catId: string): Promise<AccreditationRequirement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accreditation_requirements")
    .select(`
      *,
      accreditation_submissions (
        *,
        profiles (id, full_name, role)
      )
    `)
    .eq("category_id", catId);

  if (error) throw new Error(error.message);
  return (data || []) as unknown as AccreditationRequirement[];
}

// Fetch all revision versions for a submission
export async function getSubmissionVersionsList(submissionId: string): Promise<SubmissionVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accreditation_submission_versions")
    .select(`
      *,
      profiles (id, full_name)
    `)
    .eq("submission_id", submissionId)
    .order("version", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as SubmissionVersion[];
}

// Upload supporting document evidence
export async function uploadEvidenceAction(formData: FormData): Promise<AccreditationSubmission> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const requirementId = formData.get("requirement_id") as string;
  const notes = formData.get("notes") as string;
  const file = formData.get("file") as File | null;

  if (!requirementId || !file || file.size === 0) {
    throw new Error("Persyaratan dan berkas bukti harus dilampirkan");
  }

  // 1. Upload to storage bucket 'documents'
  const fileExtension = file.name.split(".").pop();
  const randNum = Math.floor(Math.random() * 90000 + 10000);
  const storagePath = `accreditation/${Date.now()}-${randNum}.${fileExtension}`;
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false
    });

  if (storageError) throw new Error(storageError.message);

  const { data: { publicUrl } } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath);

  // 2. Check if a submission already exists
  const { data: existingSub } = await supabase
    .from("accreditation_submissions")
    .select("id, version")
    .eq("requirement_id", requirementId)
    .single();

  let submission: AccreditationSubmission;

  if (existingSub) {
    // Increment version count
    const nextVersion = existingSub.version + 1;
    const { data, error } = await supabase
      .from("accreditation_submissions")
      .update({
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        version: nextVersion,
        status: "review", // Back to review state upon new revision upload
        notes: notes || null,
        uploaded_by: user.id
      })
      .eq("id", existingSub.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    submission = data as AccreditationSubmission;

    // Log version
    await supabase
      .from("accreditation_submission_versions")
      .insert([{
        submission_id: existingSub.id,
        version: nextVersion,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        notes: notes || null,
        uploaded_by: user.id
      }]);
  } else {
    // Create new submission
    const { data, error } = await supabase
      .from("accreditation_submissions")
      .insert([{
        requirement_id: requirementId,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        version: 1,
        status: "review",
        notes: notes || null,
        uploaded_by: user.id
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    submission = data as AccreditationSubmission;

    // Log version 1
    await supabase
      .from("accreditation_submission_versions")
      .insert([{
        submission_id: submission.id,
        version: 1,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        notes: notes || null,
        uploaded_by: user.id
      }]);
  }

  revalidatePath("/dashboard/accreditation");
  return submission;
}

// Save Assessor Review comments and toggle approval states
export async function saveAssessorCommentAction(
  submissionId: string,
  comments: string,
  status: "draft" | "review" | "disetujui" | "arsip"
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accreditation_submissions")
    .update({
      assessor_comments: comments || null,
      status: status
    })
    .eq("id", submissionId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/accreditation");
  return { success: true };
}
