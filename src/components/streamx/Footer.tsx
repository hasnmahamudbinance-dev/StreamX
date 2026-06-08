'use client';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">StreamX</span>
            <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Powered by TMDB</span>
            <span>&bull;</span>
            <span>Built with Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
