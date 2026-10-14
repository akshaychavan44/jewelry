export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading admin page" className="space-y-6">
      <span className="sr-only">Loading admin page…</span>
      <div className="space-y-3 border-b border-line pb-6 motion-safe:animate-pulse" aria-hidden>
        <div className="h-3 w-24 rounded bg-parchment" />
        <div className="h-9 w-64 max-w-full rounded bg-parchment" />
        <div className="h-4 w-96 max-w-full rounded bg-parchment" />
      </div>
      <div className="min-h-64 rounded-[3px] border border-line bg-porcelain p-5 motion-safe:animate-pulse" aria-hidden>
        {[0, 1, 2, 3].map((row) => <div key={row} className="my-5 h-4 rounded bg-parchment" />)}
      </div>
    </div>
  );
}
