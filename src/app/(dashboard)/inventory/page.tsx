import { PageHeader } from "@/components/shared/page-header";
import InventoryClient from "./InventoryClient";
import { getAssetsList, getInventoryStats } from "./actions";

export const metadata = {
  title: "Inventaris Barang & Sarana SNP — eLibrary",
  description: "Kelola sarana prasarana sekolah dan kelengkapan standar nasional perpustakaan",
};

export default async function InventoryPage() {
  const [assets, stats] = await Promise.all([
    getAssetsList(),
    getInventoryStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaris Barang & Sarana"
        description="Kelola sarana prasarana sekolah, histori pemeliharaan preventif, dan laporan kerusakan aset perpustakaan"
      />

      <InventoryClient initialAssets={assets} initialStats={stats} />
    </div>
  );
}
