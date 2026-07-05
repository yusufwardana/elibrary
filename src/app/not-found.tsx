import { Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="relative max-w-md space-y-6">
        {/* Decorative backdrop */}
        <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_60%)]" />

        {/* 404 Visual Icon */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg">
          <span className="text-3xl font-extrabold tracking-tighter">404</span>
        </div>

        {/* Messaging */}
        <div className="space-y-2 relative">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Maaf, kami tidak dapat menemukan halaman yang Anda cari. Halaman tersebut mungkin telah dipindahkan, dihapus, atau tautan yang Anda ikuti salah.
          </p>
        </div>

        {/* Action buttons */}
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            asChild
            variant="default"
            className="flex items-center justify-center gap-2"
          >
            <Link href="/dashboard" id="notfound-home-button">
              <Home className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Halaman Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
