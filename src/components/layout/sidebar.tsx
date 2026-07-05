"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { NAV_ITEMS } from "@/lib/constants";
import { Logo } from "@/components/shared/logo";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import type { UserProfile } from "@/types";
import { logout } from "@/app/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const sidebarVariants = {
  open: { width: 260 },
  closed: { width: 72 },
};

const roleLabels: Record<string, string> = {
  administrator: "Admin",
  kepala_perpustakaan: "Kepala Perpus",
  petugas: "Petugas",
  guru: "Guru",
  siswa: "Siswa",
};

interface SidebarProps {
  profile: UserProfile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const { isOpen, toggle } = useSidebar();

  const handleLogout = async () => {
    await logout();
  };

  const userRole = profile?.role || "siswa";
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <motion.aside
      initial={false}
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative hidden h-screen flex-col border-r border-sidebar-border bg-sidebar lg:flex",
        "overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Logo showText={isOpen} size="sm" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavItems.map((item) => (
          <SidebarNavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer / User Profile & Actions */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {profile && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50",
              !isOpen && "justify-center"
            )}
          >
            <Avatar className="h-9 w-9 border border-sidebar-border">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              ) : null}
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>

            {isOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 flex-col overflow-hidden text-left"
              >
                <span className="truncate text-xs font-semibold text-sidebar-foreground">
                  {profile.full_name}
                </span>
                <span className="text-[10px] font-medium text-sidebar-foreground/50">
                  {roleLabels[profile.role] || profile.role}
                </span>
              </motion.div>
            )}

            {isOpen && (
              <button
                id="sidebar-logout-button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-destructive transition-colors"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <button
            id="sidebar-collapse-toggle"
            onClick={toggle}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isOpen ? "px-3" : "w-full justify-center"
            )}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="truncate text-xs">Tutup Sidebar</span>
              </>
            ) : (
              <ChevronRight className="h-5 w-5 shrink-0" />
            )}
          </button>

          {!isOpen && profile && (
            <button
              id="sidebar-logout-collapsed"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-destructive transition-colors"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
