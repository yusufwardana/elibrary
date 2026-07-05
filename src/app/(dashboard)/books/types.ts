export interface Category {
  id: string;
  name: string;
  description: string | null;
  ddc_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Publisher {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  name: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookAuthorRelation {
  authors: {
    id: string;
    name: string;
  };
}

export interface Book {
  id: string;
  title: string;
  isbn: string | null;
  ddc: string | null;
  barcode: string | null;
  qr_code: string | null;
  cover_url: string | null;
  category_id: string;
  publisher_id: string;
  publish_year: number;
  quantity: number;
  available_quantity: number;
  status: "tersedia" | "dipinjam" | "rusak" | "hilang";
  description: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
  publishers?: Publisher | null;
  book_authors?: BookAuthorRelation[];
}

export interface CatalogData {
  categories: Category[];
  publishers: Publisher[];
  authors: Author[];
}
