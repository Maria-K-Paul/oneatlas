import Link from "next/link";
import { cn } from "@/platform/ui/cn";
import { BOARDS } from "../boards";

export function boardHref(slug: string): string {
  return slug === "overall" ? "/rankings" : `/rankings/${slug}`;
}

/** Links to every board; scrolls horizontally on small screens. */
export function BoardNav({ active }: { active: string }) {
  return (
    <nav aria-label="Leaderboards" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1.5 pb-1 sm:flex-wrap">
        {BOARDS.map((board) => (
          <li key={board.slug}>
            <Link
              href={boardHref(board.slug)}
              aria-current={board.slug === active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                board.slug === active &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
              )}
            >
              {board.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
