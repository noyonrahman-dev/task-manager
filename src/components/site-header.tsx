import Link from "next/link";
import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Stride home">
          <Logo className="size-7" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">Stride</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="View source on GitHub"
            className="hidden sm:inline-flex"
          >
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="size-4" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
