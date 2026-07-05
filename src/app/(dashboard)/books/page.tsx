import { getBooksList, getCatalogData } from "./actions";
import BooksClient from "./BooksClient";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "Katalog Buku",
  description: "Kelola daftar katalog koleksi buku dan stok perpustakaan sekolah.",
};

export default async function BooksPage() {
  // Fetch initial data server-side
  const [initialBooks, initialCatalog] = await Promise.all([
    getBooksList().catch(() => []),
    getCatalogData().catch(() => ({
      categories: [],
      publishers: [],
      authors: [],
    })),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Koleksi Buku"
        description="Kelola metadata buku, kode klasifikasi DDC, pencetakan kode batang/QR, dan sirkulasi stok."
      />
      
      <BooksClient 
        initialBooks={initialBooks} 
        initialCatalog={initialCatalog} 
      />
    </div>
  );
}
