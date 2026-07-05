import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Brand & Left Panel (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(30,58,138,0.4),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(245,158,11,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-white/[0.02]" />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 p-2 shadow-lg shadow-amber-500/20">
              <BookOpen className="h-6 w-6 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white">eLibrary</span>
              <span className="text-[10px] font-medium tracking-wider text-slate-400">PERPUSTAKAAN SEKOLAH</span>
            </div>
          </Link>
        </div>

        {/* Big Quote / Headline */}
        <div className="relative z-10 my-auto max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Gerbang Pengetahuan dan Literasi Digital Sekolah
          </h1>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Kelola, pinjam, dan jelajahi ribuan buku secara digital. Mengintegrasikan teknologi modern untuk memudahkan administrasi perpustakaan sekolah.
          </p>

          {/* Premium Glass Card */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <p className="text-sm italic text-slate-300">
              &ldquo;Buku adalah paspor untuk masa depan, karena hari esok dimiliki oleh orang-orang yang mempersiapkannya hari ini.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                LP
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Layanan Perpustakaan</div>
                <div className="text-[10px] text-slate-400">Integrasi Supabase Auth & RLS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} eLibrary. All rights reserved.
        </div>
      </div>

      {/* Right Form Area */}
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-12 lg:px-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary p-2 shadow-lg shadow-primary/20">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
              eLibrary
            </h2>
            <p className="mt-1 text-xs font-semibold tracking-wider text-muted-foreground">
              PERPUSTAKAAN SEKOLAH
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
