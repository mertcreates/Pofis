"use client";
import AppShell from "@/components/shell/app-shell.js";
import RequestError from "@/components/request-error.js";
import { useAppearance } from "@/data/use-appearance";
import { ui } from "@/lib/ui-text.js";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const appearance = useAppearance();
  return (
    <AppShell
      appearance={appearance}
      showNavigation={false}
      onDisconnect={undefined}
      onSection={undefined}
    >
      <RequestError
        error={{
          code: error.digest || "RUNTIME_ERROR",
          status: 0,
          message: ui.requestFailed,
        }}
        onRetry={retry}
        busy={false}
      />
    </AppShell>
  );
}
