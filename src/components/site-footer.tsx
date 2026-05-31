export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-6">
      <div className="container flex flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
        <p>
          Built with Next.js. <span className="hidden sm:inline">Open source &amp; MIT licensed.</span>
        </p>
        <p>
          Stride &mdash; Move through your day with clarity.
        </p>
      </div>
    </footer>
  );
}
