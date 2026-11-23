export type NavItem = { href: string; label: string };

export const siteConfig = {
  name: "OneAtlas",
  tagline: "AI model discovery and intelligence",
  description:
    "Discover, compare and evaluate AI models across labs and providers: specs, pricing, capabilities and benchmarks in one place.",
  nav: [
    { href: "/models", label: "Models" },
    { href: "/rankings", label: "Rankings" },
    { href: "/benchmarks", label: "Benchmarks" },
    { href: "/labs", label: "Labs" },
    { href: "/providers", label: "Providers" },
    { href: "/compare", label: "Compare" },
  ] satisfies NavItem[],
} as const;
