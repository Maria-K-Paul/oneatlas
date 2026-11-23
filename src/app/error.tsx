"use client";

import { useEffect } from "react";
import { PageContainer } from "@/platform/layout";
import { Button } from "@/platform/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="text-sm font-medium text-muted-foreground">Error</p>
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn’t load this page. Try again, and if it keeps happening, check back shortly.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </PageContainer>
  );
}
