"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Logo } from "@/components/shared/logo";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        id="mobile-sidebar-trigger"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-foreground transition-colors hover:bg-accent lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar shadow-2xl lg:hidden"
              )}
            >
              {/* Header */}
              <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                <Logo size="sm" />
                <button
                  id="mobile-sidebar-close"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {NAV_ITEMS.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setIsOpen(false)}
                  >
                    <SidebarNavItem item={item} />
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
