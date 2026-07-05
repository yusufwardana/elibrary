import { Book } from "../books/types";

export interface LoanProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

export interface BorrowDetail {
  id: string;
  borrowing_id: string;
  book_id: string;
  return_status: "dipinjam" | "kembali";
  returned_at: string | null;
  books?: Book | null;
}

export interface Borrowing {
  id: string;
  user_id: string;
  borrow_date: string;
  due_date: string;
  status: "aktif" | "kembali" | "terlambat";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: LoanProfile | null;
  borrow_details?: BorrowDetail[];
}

export interface ReturnLog {
  id: string;
  borrowing_id: string;
  borrow_detail_id: string | null;
  return_date: string;
  staff_id: string | null;
  fine_amount: number;
  fine_paid: number;
  payment_status: "tidak_ada" | "belum_bayar" | "lunas";
  created_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  reservation_date: string;
  expiration_date: string;
  status: "menunggu" | "selesai" | "dibatalkan" | "kedaluwarsa";
  created_at: string;
  updated_at: string;
  profiles?: LoanProfile | null;
  books?: Book | null;
}

export interface CirculationStats {
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  totalFines: number;
  totalReservations: number;
}
