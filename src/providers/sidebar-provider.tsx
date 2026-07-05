"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SidebarContextType } from "@/types";

const SIDEBAR_STORAGE_KEY = "elibrary-sidebar-open";
const MOBILE_BREAKPOINT = 1024;

export const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);

      if (mobile) {
        // Always start closed on mobile
        setIsOpen(false);
      } else {
        // Restore persisted desktop state
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setIsOpen(stored !== null ? stored === "true" : true);
      }
    };

    // Set initial value
    handleChange(mql);

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Persist desktop state to localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
    }
  }, [isOpen, isMobile]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);
  const open = useCallback(() => setIsOpen(true), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggle, close, open }}>
      {children}
    </SidebarContext.Provider>
  );
}
