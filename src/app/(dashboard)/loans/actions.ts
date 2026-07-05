"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Borrowing, Reservation, CirculationStats, LoanProfile } from "./types";

// Get user profile details for checkout autocomplete selection
export async function getActiveUsersList(): Promise<LoanProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("is_active", true)
    .order("full_name");

  if (error) throw new Error(error.message);
  return data || [];
}

// Fetch all loans/borrowings with nested details, profile and books
export async function getLoansList(): Promise<Borrowing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrowings")
    .select(`
      *,
      profiles (id, full_name, email, role, avatar_url),
      borrow_details (
        id,
        borrowing_id,
        book_id,
        return_status,
        returned_at,
        books (id, title, isbn, barcode, cover_url)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as Borrowing[];
}

// Fetch reservations
export async function getReservationsList(): Promise<Reservation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      *,
      profiles (id, full_name, email, role, avatar_url),
      books (id, title, isbn, barcode, available_quantity)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as Reservation[];
}

// Fetch circulation statistics
export async function getCirculationStats(): Promise<CirculationStats> {
  const supabase = await createClient();
  
  const [loansRes, reservationsRes, returnsRes] = await Promise.all([
    supabase.from("borrowings").select("status"),
    supabase.from("reservations").select("status").eq("status", "menunggu"),
    supabase.from("returns").select("fine_amount"),
  ]);

  const loans = loansRes.data || [];
  const reservationsCount = reservationsRes.data?.length || 0;
  const finesSum = returnsRes.data?.reduce((acc, curr) => acc + Number(curr.fine_amount), 0) || 0;

  const totalLoans = loans.length;
  const activeLoans = loans.filter(l => l.status === "aktif").length;
  const overdueLoans = loans.filter(l => l.status === "terlambat").length;

  return {
    totalLoans,
    activeLoans,
    overdueLoans,
    totalFines: finesSum,
    totalReservations: reservationsCount,
  };
}

// Create a new borrowing record
export async function createBorrowAction(
  userId: string, 
  bookIds: string[], 
  dueDateStr: string
): Promise<Borrowing> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  // 1. Validate borrow limits based on role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile) throw new Error("Profil peminjam tidak ditemukan");

  // Limit check (Siswa: max 3 active books, Guru: max 5 active books)
  const maxBooks = profile.role === "siswa" ? 3 : 5;

  const { data: activeLoans } = await supabase
    .from("borrowings")
    .select("id, borrow_details(return_status)")
    .eq("user_id", userId)
    .eq("status", "aktif");

  let activeBookCount = 0;
  activeLoans?.forEach(loan => {
    const details = (loan as unknown as { borrow_details: Array<{ return_status: string }> | { return_status: string }[] | null }).borrow_details;
    const detailsArray = Array.isArray(details) ? details : details ? [details] : [];
    detailsArray.forEach((d) => {
      if (d.return_status === "dipinjam") activeBookCount++;
    });
  });

  if (activeBookCount + bookIds.length > maxBooks) {
    throw new Error(
      `Peminjam (${profile.role}) melebihi batas. Maksimum buku dipinjam aktif adalah ${maxBooks}. Saat ini meminjam ${activeBookCount} buku.`
    );
  }

  // 2. Validate that none of the user's active borrowings are overdue
  const today = new Date().toISOString().split("T")[0];
  const overdueCheck = await supabase
    .from("borrowings")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "aktif")
    .lt("due_date", today);

  if (overdueCheck.data && overdueCheck.data.length > 0) {
    throw new Error("Peminjam memiliki peminjaman terlambat yang belum dikembalikan!");
  }

  // 3. Create Borrowing header record
  const { data: borrowing, error: borrowError } = await supabase
    .from("borrowings")
    .insert([{
      user_id: userId,
      due_date: dueDateStr,
      status: "aktif",
      created_by: user.id
    }])
    .select()
    .single();

  if (borrowError) throw new Error(borrowError.message);

  // 4. Create Borrow details (triggers stock reduction DB trigger)
  const borrowDetails = bookIds.map(bookId => ({
    borrowing_id: borrowing.id,
    book_id: bookId,
    return_status: "dipinjam"
  }));

  const { error: detailsError } = await supabase
    .from("borrow_details")
    .insert(borrowDetails);

  if (detailsError) {
    // Rollback header to avoid orphaned data
    await supabase.from("borrowings").delete().eq("id", borrowing.id);
    throw new Error(detailsError.message);
  }

  revalidatePath("/dashboard/loans");
  revalidatePath("/dashboard/books");
  return borrowing as Borrowing;
}

// Return a specific book detail line item
export async function processReturnAction(
  borrowDetailId: string,
  fineAmount: number,
  finePaid: number,
  paymentStatus: "tidak_ada" | "belum_bayar" | "lunas"
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  // 1. Fetch borrow detail record
  const { data: detail, error: detailError } = await supabase
    .from("borrow_details")
    .select("*, borrowings(*)")
    .eq("id", borrowDetailId)
    .single();

  if (detailError || !detail) throw new Error("Catatan peminjaman detail tidak ditemukan");

  // 2. Update status of detail line (triggers stock restore trigger)
  const { error: updateDetailError } = await supabase
    .from("borrow_details")
    .update({ 
      return_status: "kembali", 
      returned_at: new Date().toISOString() 
    })
    .eq("id", borrowDetailId);

  if (updateDetailError) throw new Error(updateDetailError.message);

  // 3. Log return details & fine if applicable
  if (fineAmount > 0) {
    const { error: returnError } = await supabase
      .from("returns")
      .insert([{
        borrowing_id: detail.borrowing_id,
        borrow_detail_id: borrowDetailId,
        return_date: new Date().toISOString().split("T")[0],
        staff_id: user.id,
        fine_amount: fineAmount,
        fine_paid: finePaid,
        payment_status: paymentStatus
      }]);

    if (returnError) throw new Error(returnError.message);
  }

  // 4. Check if all other items in this borrowing have been returned. If so, mark borrowing header as returned
  const { data: remaining } = await supabase
    .from("borrow_details")
    .select("id")
    .eq("borrowing_id", detail.borrowing_id)
    .eq("return_status", "dipinjam");

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("borrowings")
      .update({ status: "kembali" })
      .eq("id", detail.borrowing_id);
  }

  revalidatePath("/dashboard/loans");
  revalidatePath("/dashboard/books");
  return { success: true };
}

// Create a reservation for out of stock books
export async function createReservationAction(bookId: string): Promise<Reservation> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  // Set reservation expiry to 3 days from now
  const reservationDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(reservationDate.getDate() + 3);

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert([{
      user_id: user.id,
      book_id: bookId,
      reservation_date: reservationDate.toISOString().split("T")[0],
      expiration_date: expiryDate.toISOString().split("T")[0],
      status: "menunggu"
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/loans");
  return reservation as Reservation;
}

// Cancel reservation
export async function cancelReservationAction(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status: "dibatalkan" })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/loans");
  return { success: true };
}
