"use client";

import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  showText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { icon: "h-6 w-6", text: "text-lg" },
  md: { icon: "h-8 w-8", text: "text-xl" },
  lg: { icon: "h-10 w-10", text: "text-2xl" },
};

export function Logo({ showText = true, className, size = "md" }: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <motion.div
        whileHover={{ rotate: -10, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 p-2 shadow-lg shadow-primary/25"
      >
        <BookOpen className={cn("text-primary-foreground", sizes.icon)} />
        <div className="absolute inset-0 rounded-xl bg-white/10" />
      </motion.div>
      {showText && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex flex-col"
        >
          <span
            className={cn(
              "font-bold leading-none tracking-tight text-foreground",
              sizes.text
            )}
          >
            eLibrary
          </span>
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
            PERPUSTAKAAN
          </span>
        </motion.div>
      )}
    </div>
  );
}
