import { BookOpen } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="relative flex flex-col items-center gap-4">
        {/* Glow backdrop */}
        <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.15),transparent_60%)] animate-pulse-soft" />

        {/* Animated logo */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-xl shadow-primary/25 animate-bounce">
          <BookOpen className="h-8 w-8 text-primary-foreground" />
          <div className="absolute inset-0 rounded-2xl bg-white/10" />
        </div>

        {/* Text loading */}
        <div className="relative flex flex-col items-center text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            eLibrary
          </h2>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mt-0.5">
            Memuat Halaman...
          </p>
        </div>

        {/* Premium loader bar */}
        <div className="mt-4 h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-primary animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
