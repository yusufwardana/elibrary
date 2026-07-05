"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="relative max-w-md space-y-6">
        {/* Decorative backdrop */}
        <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1),transparent_60%)] animate-pulse-soft" />

        {/* Warning Icon */}
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-lg">
          <AlertCircle className="h-8 w-8" />
        </div>

        {/* Messaging */}
        <div className="space-y-2 relative">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Terjadi Kesalahan!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sistem mendeteksi kesalahan yang tidak terduga saat memproses halaman ini. Silakan coba memuat ulang halaman.
          </p>
          {error.message && (
            <div className="mt-4 rounded-lg bg-muted p-3 text-left font-mono text-xs text-muted-foreground border border-border max-h-32 overflow-auto">
              Error: {error.message}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => reset()}
            variant="default"
            className="flex items-center justify-center gap-2"
            id="error-reset-button"
          >
            <RotateCcw className="h-4 w-4" />
            Coba Lagi
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
