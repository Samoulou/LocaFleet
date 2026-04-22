export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-56 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-16 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-40 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="h-12 border-b border-border bg-muted px-4 flex items-center gap-4">
          {[24, 20, 18, 22, 16].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded-md bg-muted animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-border px-4 flex items-center gap-4"
          >
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse shrink-0" />
            <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded-md bg-muted animate-pulse ml-auto" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
