"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AdminDocument, DocumentVersion, DocumentCategory } from "./types";

// Fetch all active (non-archived) documents
export async function getDocumentsList(): Promise<AdminDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accreditation_documents")
    .select(`
      *,
      profiles (id, full_name, role)
    `)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as AdminDocument[];
}

// Fetch archived documents
export async function getArchivedDocuments(): Promise<AdminDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accreditation_documents")
    .select(`
      *,
      profiles (id, full_name, role)
    `)
    .eq("is_archived", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as AdminDocument[];
}

// Fetch version history for a specific document
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_versions")
    .select(`
      *,
      profiles (id, full_name)
    `)
    .eq("document_id", documentId)
    .order("version", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as DocumentVersion[];
}

// Upload a new document and log version 1
export async function uploadDocumentAction(formData: FormData): Promise<AdminDocument> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const category = formData.get("category") as DocumentCategory;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("file") as File;

  if (!category || !title || !file) {
    throw new Error("Kategori, Judul, dan Berkas dokumen harus diisi");
  }

  // 1. Upload file to Supabase Storage Bucket
  const fileExtension = file.name.split(".").pop();
  const storagePath = `${category}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
  
  // Convert File to ArrayBuffer and then Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false
    });

  if (storageError) {
    throw new Error(`Gagal mengunggah berkas ke Storage: ${storageError.message}`);
  }

  // Get public url
  const { data: { publicUrl } } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath);

  // 2. Insert document record
  const { data: doc, error: docError } = await supabase
    .from("accreditation_documents")
    .insert([{
      category,
      title,
      description: description || null,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      version: 1,
      status: "draft",
      uploaded_by: user.id
    }])
    .select()
    .single();

  if (docError) {
    // Cleanup storage file on DB error
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error(docError.message);
  }

  // 3. Insert Version 1 log
  const { error: versionError } = await supabase
    .from("document_versions")
    .insert([{
      document_id: doc.id,
      version: 1,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: user.id,
      notes: "Inisialisasi dokumen baru (Versi 1)"
    }]);

  if (versionError) {
    // Cleanup if versions fail
    await supabase.from("accreditation_documents").delete().eq("id", doc.id);
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error(versionError.message);
  }

  revalidatePath("/dashboard/admin");
  return doc as AdminDocument;
}

// Upload a new version for an existing document
export async function uploadNewVersionAction(
  documentId: string,
  formData: FormData
): Promise<AdminDocument> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const notes = formData.get("notes") as string;
  const file = formData.get("file") as File;

  if (!file) throw new Error("Berkas untuk versi baru harus dilampirkan");

  // Get current document info
  const { data: currentDoc, error: fetchError } = await supabase
    .from("accreditation_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !currentDoc) throw new Error("Dokumen asal tidak ditemukan");

  const nextVersion = currentDoc.version + 1;
  const fileExtension = file.name.split(".").pop();
  const storagePath = `${currentDoc.category}/${Date.now()}-v${nextVersion}.${fileExtension}`;

  // Upload new version to storage
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false
    });

  if (storageError) throw new Error(`Gagal mengunggah berkas ke Storage: ${storageError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath);

  // Update document version info
  const { data: updatedDoc, error: updateError } = await supabase
    .from("accreditation_documents")
    .update({
      version: nextVersion,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      status: "review" // Reset status back to review on file update
    })
    .eq("id", documentId)
    .select()
    .single();

  if (updateError) {
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error(updateError.message);
  }

  // Insert Version History Log
  const { error: versionError } = await supabase
    .from("document_versions")
    .insert([{
      document_id: documentId,
      version: nextVersion,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: user.id,
      notes: notes || `Pembaruan dokumen ke versi ${nextVersion}`
    }]);

  if (versionError) throw new Error(versionError.message);

  revalidatePath("/dashboard/admin");
  return updatedDoc as AdminDocument;
}

// Update document approval status (e.g. approve a document)
export async function updateDocumentStatusAction(
  documentId: string,
  status: "draft" | "review" | "disetujui" | "arsip"
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accreditation_documents")
    .update({ status })
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
  return { success: true };
}

// Archive a document
export async function archiveDocumentAction(documentId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accreditation_documents")
    .update({ 
      is_archived: true,
      status: "arsip"
    })
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
  return { success: true };
}

// Restore an archived document
export async function restoreDocumentAction(documentId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accreditation_documents")
    .update({ 
      is_archived: false,
      status: "draft"
    })
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
  return { success: true };
}
