export type AssetCategory =
  | "rak_buku"
  | "meja"
  | "kursi"
  | "komputer"
  | "printer"
  | "jaringan"
  | "ac"
  | "proyektor"
  | "scanner";

export interface InventoryAsset {
  id: string;
  name: string;
  category: AssetCategory;
  asset_code: string;
  condition: "baik" | "rusak_ringan" | "rusak_berat";
  location: string | null;
  photo_url: string | null;
  purchase_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  maintenance_date: string;
  details: string;
  performed_by: string | null;
  cost: number;
  next_maintenance_date: string | null;
  created_at: string;
}

export interface DamageReport {
  id: string;
  asset_id: string;
  reported_by: string | null;
  report_date: string;
  description: string;
  status: "dilaporkan" | "perbaikan" | "selesai" | "dibuang";
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
  inventory_assets?: InventoryAsset | null;
}

export interface RepairHistory {
  id: string;
  damage_report_id: string;
  repair_date: string;
  repair_details: string;
  cost: number;
  repaired_by: string | null;
  status: "proses" | "selesai";
  created_at: string;
}

export interface InventoryStats {
  totalAssets: number;
  goodAssets: number;
  lightDamagedAssets: number;
  heavyDamagedAssets: number;
}
