export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome banner skeleton */}
      <div className="rounded-2xl bg-muted h-32" />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-xl ring-1 ring-border p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              <div className="h-11 w-11 rounded-xl bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl ring-1 ring-border p-5">
          <div className="h-4 w-40 rounded bg-muted mb-4" />
          <div className="h-[200px] w-full rounded-lg bg-muted" />
        </div>
        <div className="bg-card rounded-xl ring-1 ring-border p-5">
          <div className="h-4 w-32 rounded bg-muted mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
