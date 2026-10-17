"use client";
import AppShell from "@/components/shell/app-shell.js";
import RequestError from "@/components/request-error.js";
import { useAppearance } from "@/data/use-appearance";
import { ui } from "@/lib/ui-text.js";
import { toRequestFailure } from "@/lib/pdks-failure";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const appearance = useAppearance();
  return (
    <AppShell appearance={appearance}>
      <RequestError
        error={toRequestFailure({
          code: "RUNTIME_ERROR",
          details: { diagnostic: error.digest || ui.apiErrors.unexpectedServerError },
        }, "runtime")}
        onRetry={retry}
        busy={false}
      />
    </AppShell>
  );
}
