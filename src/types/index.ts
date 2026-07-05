export type UserRole =
  | "administrator"
  | "kepala_perpustakaan"
  | "petugas"
  | "guru"
  | "siswa";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  description?: string;
  roles?: UserRole[];
  disabled?: boolean;
}

export interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}
