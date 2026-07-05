"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Category, Publisher, Author, Book, CatalogData } from "./types";

const bookSchema = z.object({
  title: z.string().min(1, "Judul buku harus diisi"),
  isbn: z.string().optional().or(z.literal("")),
  ddc: z.string().optional().or(z.literal("")),
  barcode: z.string().optional().or(z.literal("")),
  qr_code: z.string().optional().or(z.literal("")),
  cover_url: z.string().optional().or(z.literal("")),
  category_id: z.string().uuid("Kategori harus dipilih"),
  publisher_id: z.string().uuid("Penerbit harus dipilih"),
  publish_year: z.coerce.number().min(1000).max(new Date().getFullYear()),
  quantity: z.coerce.number().min(0),
  available_quantity: z.coerce.number().min(0),
  status: z.enum(["tersedia", "dipinjam", "hilang", "rusak"]),
  description: z.string().optional().or(z.literal("")),
  author_ids: z.array(z.string().uuid()).min(1, "Minimal pilih satu penulis"),
});

export async function getCatalogData(): Promise<CatalogData> {
  const supabase = await createClient();

  const [categoriesRes, publishersRes, authorsRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("publishers").select("*").order("name"),
    supabase.from("authors").select("*").order("name"),
  ]);

  return {
    categories: categoriesRes.data || [],
    publishers: publishersRes.data || [],
    authors: authorsRes.data || [],
  };
}

export async function createCategory(name: string, description?: string, ddcCode?: string): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert([{ name, description, ddc_code: ddcCode || null }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/books");
  return data as Category;
}

export async function createPublisher(name: string, address?: string, phone?: string, email?: string): Promise<Publisher> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publishers")
    .insert([{ name, address, phone, email }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/books");
  return data as Publisher;
}

export async function createAuthor(name: string, bio?: string): Promise<Author> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("authors")
    .insert([{ name, bio }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/books");
  return data as Author;
}

export async function createBook(values: z.infer<typeof bookSchema>): Promise<Book> {
  const supabase = await createClient();

  // Validate values
  const result = bookSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  const { author_ids, ...bookData } = values;

  // Insert book
  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert([bookData])
    .select()
    .single();

  if (bookError) throw new Error(bookError.message);

  // Insert book-authors junction
  const bookAuthorsJunction = author_ids.map((author_id) => ({
    book_id: book.id,
    author_id,
  }));

  const { error: junctionError } = await supabase
    .from("book_authors")
    .insert(bookAuthorsJunction);

  if (junctionError) throw new Error(junctionError.message);

  revalidatePath("/dashboard/books");
  return book as Book;
}

export async function updateBook(id: string, values: z.infer<typeof bookSchema>) {
  const supabase = await createClient();

  const result = bookSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  const { author_ids, ...bookData } = values;

  // Update book details
  const { error: bookError } = await supabase
    .from("books")
    .update(bookData)
    .eq("id", id);

  if (bookError) throw new Error(bookError.message);

  // Delete previous book-author links
  const { error: deleteError } = await supabase
    .from("book_authors")
    .delete()
    .eq("book_id", id);

  if (deleteError) throw new Error(deleteError.message);

  // Insert new book-author links
  const bookAuthorsJunction = author_ids.map((author_id) => ({
    book_id: id,
    author_id,
  }));

  const { error: junctionError } = await supabase
    .from("book_authors")
    .insert(bookAuthorsJunction);

  if (junctionError) throw new Error(junctionError.message);

  revalidatePath("/dashboard/books");
  return { success: true };
}

export async function deleteBook(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/books");
  return { success: true };
}

export async function getBooksList(): Promise<Book[]> {
  const supabase = await createClient();

  // Fetch books with author relations, publisher name and category details
  const { data: books, error } = await supabase
    .from("books")
    .select(`
      *,
      categories (id, name, ddc_code),
      publishers (id, name),
      book_authors (
        authors (id, name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (books || []) as unknown as Book[];
}
