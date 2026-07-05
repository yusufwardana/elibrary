export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse-soft">
      {/* Welcome Banner Skeleton */}
      <div className="h-40 w-full rounded-2xl bg-muted/40 border border-muted/50 flex flex-col justify-between p-6 md:p-8">
        <div className="space-y-3">
          <div className="h-6 w-1/3 rounded-lg bg-muted/60" />
          <div className="h-4 w-2/3 rounded-lg bg-muted/60" />
        </div>
        <div className="h-10 w-40 rounded-xl bg-muted/60 self-end" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-60 rounded-lg bg-muted/60" />
        <div className="h-4 w-80 rounded-lg bg-muted/60" />
      </div>

      {/* Grid Stats Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-muted/40 border border-muted/50 p-6 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 rounded bg-muted/60" />
              <div className="h-8 w-8 rounded-lg bg-muted/60" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-16 rounded bg-muted/60" />
              <div className="h-3 w-32 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-2 h-80 rounded-xl bg-muted/40 border border-muted/50 p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-muted/60" />
          <div className="h-3 w-64 rounded bg-muted/60" />
          <div className="space-y-3 pt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted/60" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 rounded bg-muted/60" />
                    <div className="h-3 w-32 rounded bg-muted/60" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-full bg-muted/60" />
              </div>
            ))}
          </div>
        </div>

        <div className="h-80 rounded-xl bg-muted/40 border border-muted/50 p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-muted/60" />
          <div className="h-3 w-48 rounded bg-muted/60" />
          <div className="space-y-4 pt-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted/50 border border-muted/60 p-3" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
