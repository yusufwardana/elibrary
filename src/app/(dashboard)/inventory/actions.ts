"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InventoryAsset, AssetMaintenance, DamageReport, RepairHistory, InventoryStats, AssetCategory } from "./types";

// Fetch all inventory items
export async function getAssetsList(): Promise<InventoryAsset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch inventory statistics
export async function getInventoryStats(): Promise<InventoryStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_assets")
    .select("condition");

  if (error) throw new Error(error.message);

  const assets = data || [];
  const totalAssets = assets.length;
  const goodAssets = assets.filter((a) => a.condition === "baik").length;
  const lightDamagedAssets = assets.filter((a) => a.condition === "rusak_ringan").length;
  const heavyDamagedAssets = assets.filter((a) => a.condition === "rusak_berat").length;

  return {
    totalAssets,
    goodAssets,
    lightDamagedAssets,
    heavyDamagedAssets,
  };
}

// Fetch maintenance logs for a specific asset
export async function getAssetMaintenanceHistory(assetId: string): Promise<AssetMaintenance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_maintenance")
    .select("*")
    .eq("asset_id", assetId)
    .order("maintenance_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch damage reports for a specific asset
export async function getAssetDamageReports(assetId: string): Promise<DamageReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_damage_reports")
    .select(`
      *,
      profiles (id, full_name, role)
    `)
    .eq("asset_id", assetId)
    .order("report_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as DamageReport[];
}

// Fetch repair history for a damage report
export async function getRepairHistory(reportId: string): Promise<RepairHistory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_repair_history")
    .select("*")
    .eq("damage_report_id", reportId)
    .order("repair_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Create a new inventory asset (handles uploading photo to Supabase storage)
export async function createAssetAction(formData: FormData): Promise<InventoryAsset> {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const category = formData.get("category") as AssetCategory;
  const location = formData.get("location") as string;
  const purchaseDate = formData.get("purchase_date") as string;
  const file = formData.get("photo") as File | null;

  if (!name || !category) throw new Error("Nama dan Kategori aset harus diisi");

  // Generate dynamic Asset Code: AST-CATEG-YYYY-XXXXX
  const year = purchaseDate ? purchaseDate.split("-")[0] : new Date().getFullYear().toString();
  const catCode = category.substring(0, 3).toUpperCase();
  const randNum = Math.floor(Math.random() * 90000 + 10000);
  const assetCode = `AST-${catCode}-${year}-${randNum}`;

  let photoUrl: string | null = null;

  // Upload photo to storage if present
  if (file && file.size > 0) {
    const fileExtension = file.name.split(".").pop();
    const storagePath = `assets/${Date.now()}-${randNum}.${fileExtension}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to 'documents' bucket inside 'assets' folder
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false
      });

    if (!storageError) {
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);
      photoUrl = publicUrl;
    }
  }

  // Insert into DB
  const { data: asset, error: dbError } = await supabase
    .from("inventory_assets")
    .insert([{
      name,
      category,
      asset_code: assetCode,
      condition: "baik",
      location: location || null,
      photo_url: photoUrl,
      purchase_date: purchaseDate || null,
    }])
    .select()
    .single();

  if (dbError) throw new Error(dbError.message);

  revalidatePath("/dashboard/inventory");
  return asset as InventoryAsset;
}

// Log a damage report
export async function createDamageReportAction(
  assetId: string,
  description: string,
  condition: "rusak_ringan" | "rusak_berat"
): Promise<DamageReport> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  // 1. Insert damage report
  const { data: report, error: reportError } = await supabase
    .from("asset_damage_reports")
    .insert([{
      asset_id: assetId,
      reported_by: user.id,
      description,
      status: "dilaporkan",
    }])
    .select()
    .single();

  if (reportError) throw new Error(reportError.message);

  // 2. Update asset condition state
  const { error: assetError } = await supabase
    .from("inventory_assets")
    .update({ condition })
    .eq("id", assetId);

  if (assetError) throw new Error(assetError.message);

  revalidatePath("/dashboard/inventory");
  return report as DamageReport;
}

// Record maintenance log
export async function logMaintenanceAction(
  assetId: string,
  details: string,
  cost: number,
  maintenanceDate: string,
  nextDate: string | null,
  performedBy: string
): Promise<AssetMaintenance> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_maintenance")
    .insert([{
      asset_id: assetId,
      details,
      cost,
      maintenance_date: maintenanceDate,
      next_maintenance_date: nextDate || null,
      performed_by: performedBy || null
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/inventory");
  return data as AssetMaintenance;
}

// Record a repair and resolve the damage report
export async function logRepairAction(
  damageReportId: string,
  repairDetails: string,
  cost: number,
  repairedBy: string,
  markResolved: boolean
): Promise<RepairHistory> {
  const supabase = await createClient();

  // 1. Insert repair log
  const { data: repair, error: repairError } = await supabase
    .from("asset_repair_history")
    .insert([{
      damage_report_id: damageReportId,
      repair_details: repairDetails,
      cost,
      repaired_by: repairedBy || null,
      repair_date: new Date().toISOString().split("T")[0],
      status: markResolved ? "selesai" : "proses"
    }])
    .select()
    .single();

  if (repairError) throw new Error(repairError.message);

  // 2. Resolve damage report and asset condition if resolved
  if (markResolved) {
    // Get damage report to retrieve asset id
    const { data: report } = await supabase
      .from("asset_damage_reports")
      .select("asset_id")
      .eq("id", damageReportId)
      .single();

    if (report) {
      await Promise.all([
        supabase.from("asset_damage_reports").update({ status: "selesai" }).eq("id", damageReportId),
        supabase.from("inventory_assets").update({ condition: "baik" }).eq("id", report.asset_id)
      ]);
    }
  } else {
    // Mark damage report status as in repair
    await supabase.from("asset_damage_reports").update({ status: "perbaikan" }).eq("id", damageReportId);
  }

  revalidatePath("/dashboard/inventory");
  return repair as RepairHistory;
}

// Delete inventory asset
export async function deleteAssetAction(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_assets")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/inventory");
  return { success: true };
}
