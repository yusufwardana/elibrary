import { PageHeader } from "@/components/shared/page-header";
import LoansClient from "./LoansClient";
import {
  getLoansList,
  getReservationsList,
  getCirculationStats,
  getActiveUsersList,
} from "./actions";
import { getBooksList } from "../books/actions";

export const metadata = {
  title: "Sirkulasi Peminjaman — eLibrary",
  description: "Kelola transaksi peminjaman, pengembalian, dan denda buku perpustakaan",
};

export default async function LoansPage() {
  const [loans, reservations, stats, users, books] = await Promise.all([
    getLoansList(),
    getReservationsList(),
    getCirculationStats(),
    getActiveUsersList(),
    getBooksList(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sirkulasi Peminjaman"
        description="Kelola transaksi peminjaman, pengembalian, dan denda buku perpustakaan"
      />

      <LoansClient
        initialLoans={loans}
        initialReservations={reservations}
        initialStats={stats}
        initialUsers={users}
        initialBooks={books}
      />
    </div>
  );
}
