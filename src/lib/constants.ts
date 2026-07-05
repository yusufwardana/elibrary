import type { NavItem, UserRole } from "@/types";

export const ROLES = {
  ADMIN: "administrator",
  HEAD_LIBRARIAN: "kepala_perpustakaan",
  STAFF: "petugas",
  TEACHER: "guru",
  STUDENT: "siswa",
} as const;

export type { UserRole };

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    description: "Ringkasan dan statistik perpustakaan",
  },
  {
    title: "Katalog Buku",
    href: "/dashboard/books",
    icon: "BookOpen",
    description: "Kelola koleksi buku perpustakaan",
  },
  {
    title: "Peminjaman",
    href: "/dashboard/loans",
    icon: "ArrowLeftRight",
    description: "Kelola peminjaman dan pengembalian buku",
  },
  {
    title: "Anggota",
    href: "/dashboard/members",
    icon: "Users",
    description: "Kelola data anggota perpustakaan",
    roles: [
      ROLES.ADMIN,
      ROLES.HEAD_LIBRARIAN,
      ROLES.STAFF,
    ] as UserRole[],
  },
  {
    title: "Laporan",
    href: "/dashboard/reports",
    icon: "BarChart3",
    description: "Laporan dan analisis perpustakaan",
    roles: [ROLES.ADMIN, ROLES.HEAD_LIBRARIAN] as UserRole[],
  },
  {
    title: "Inventaris",
    href: "/dashboard/inventory",
    icon: "Package",
    description: "Kelola aset sarana prasarana perpustakaan",
  },
  {
    title: "Literasi Sekolah",
    href: "/dashboard/literacy",
    icon: "BookOpen",
    description: "Pantau program membaca mandiri GLS & jurnal siswa",
  },
  {
    title: "Akreditasi SNP",
    href: "/dashboard/accreditation",
    icon: "FileCheck",
    description: "Persiapan 8 standar akreditasi perpustakaan sekolah",
  },
  {
    title: "Pengaturan",
    href: "/dashboard/settings",
    icon: "Settings",
    description: "Pengaturan sistem perpustakaan",
    roles: [ROLES.ADMIN] as UserRole[],
  },
];
