import Link from "next/link";
import { PageContainer } from "@/platform/layout";
import { Button } from "@/platform/ui/button";

export default function NotFound() {
  return (
    <PageContainer className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        The page you’re looking for doesn’t exist, or the model or lab may have been renamed.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/models">Browse models</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
