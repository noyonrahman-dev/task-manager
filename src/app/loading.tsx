export default function Loading() {
  return (
    <div className="container py-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        <div className="h-12 w-56 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
