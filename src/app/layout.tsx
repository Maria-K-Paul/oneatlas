import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CompareTray } from "@/modules/compare";
import { CommandMenu } from "@/modules/search";
import { formatDate } from "@/platform/format";
import { getDataFreshness } from "@/platform/health";
import { SiteFooter, SiteHeader, ThemeProvider, siteConfig } from "@/platform/layout";
import { TooltipProvider } from "@/platform/ui/tooltip";
import "./globals.css";

/** "Data updated Nov 22, 2026 · curated@2026-11-22", from the latest successful ingestion run. */
async function DataFreshness() {
  const { updatedAt, source } = await getDataFreshness();
  if (!updatedAt) return null;
  return (
    <p className="text-xs">
      Data updated {formatDate(updatedAt)}
      {source ? <span className="font-mono"> · {source}</span> : null}
    </p>
  );
}

const fontSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const fontMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <TooltipProvider>
            <SiteHeader search={<CommandMenu />} />
            <main id="main" className="flex flex-1 flex-col pb-20">
              {children}
            </main>
            <SiteFooter status={<DataFreshness />} />
            <CompareTray />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
