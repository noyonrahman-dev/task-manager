"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the error to your monitoring tool of choice (Sentry, Datadog…).
    console.error(error);
  }, [error]);

  return (
    <div className="container flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Stride hit an unexpected error
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Try again. If the problem persists, check the server logs or open an issue.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
