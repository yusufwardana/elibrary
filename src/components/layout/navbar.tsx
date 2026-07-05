"use client";

import Link from "next/link";
import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import type { UserProfile } from "@/types";
import { logout } from "@/app/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  className?: string;
  profile: UserProfile | null;
}

const roleLabels: Record<string, string> = {
  administrator: "Administrator",
  kepala_perpustakaan: "Kepala Perpustakaan",
  petugas: "Petugas",
  guru: "Guru",
  siswa: "Siswa",
};

export function Navbar({ className, profile }: NavbarProps) {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6",
        className
      )}
    >
      {/* Mobile Sidebar Trigger */}
      <MobileSidebar />

      {/* Search (placeholder) */}
      <div className="hidden flex-1 sm:block">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="navbar-search"
            type="text"
            placeholder="Cari buku, anggota, peminjaman..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 sm:hidden" />

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          id="navbar-notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            3
          </span>
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Dropdown */}
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                id="navbar-user-dropdown"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-primary/20 transition-all hover:ring-4 hover:ring-primary/30 focus:outline-none"
              >
                <Avatar className="h-9 w-9">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {profile.full_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {profile.email}
                  </p>
                  <p className="text-[10px] leading-none text-primary font-semibold mt-1">
                    {roleLabels[profile.role] || profile.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Profil Saya</span>
                </Link>
              </DropdownMenuItem>
              {profile.role === "administrator" && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Pengaturan</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
