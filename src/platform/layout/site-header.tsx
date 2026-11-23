import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "./logo";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { siteConfig } from "./site";
import { ThemeToggle } from "./theme-toggle";

/**
 * Sticky site header. `search` is a slot so the search module can plug in its ⌘K menu
 * without the platform layer depending on a feature module (docs §13.3, rule 5).
 */
export function SiteHeader({ search }: { search?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <MobileNav />
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 rounded-md font-semibold tracking-tight"
          aria-label={`${siteConfig.name} home`}
        >
          <LogoMark className="size-6 text-primary" />
          <span>{siteConfig.name}</span>
        </Link>
        <MainNav className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-1">
          {search}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
