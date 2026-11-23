import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "./site";

/** `status` is a slot for data freshness ("Data updated …"), filled by the app layout. */
export function SiteFooter({ status }: { status?: ReactNode }) {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <p className="font-medium text-foreground">{siteConfig.name}</p>
          <p>
            Sample dataset for demonstration. Prices and benchmark scores are illustrative and may
            not match current vendor figures.
          </p>
          {status}
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <a href="/api/v1/health" className="hover:text-foreground">
            API status
          </a>
        </nav>
      </div>
    </footer>
  );
}
