"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import type { NavItem } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Users,
  BarChart3,
  Settings,
};

interface SidebarNavItemProps {
  item: NavItem;
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const pathname = usePathname();
  const { isOpen, isMobile } = useSidebar();
  const Icon = iconMap[item.icon] || LayoutDashboard;

  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  const showLabel = isOpen || isMobile;

  return (
    <Link href={item.href} className="block">
      <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          !showLabel && "justify-center px-2"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute inset-0 rounded-lg bg-sidebar-primary"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <Icon
          className={cn(
            "relative z-10 h-5 w-5 shrink-0 transition-colors",
            isActive
              ? "text-sidebar-primary-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
          )}
        />
        {showLabel && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 truncate"
          >
            {item.title}
          </motion.span>
        )}
      </motion.div>
    </Link>
  );
}
