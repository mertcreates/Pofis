"use client";
import AppShell from "@/components/shell/app-shell.js";
import { useAppearance } from "@/data/use-appearance";
import { NotFoundState } from "@/components/not-found-state";

export default function NotFound() {
  const appearance = useAppearance();
  return (
    <AppShell
      appearance={appearance}
      showNavigation={false}
      onDisconnect={undefined}
      onSection={undefined}
    >
      <NotFoundState />
    </AppShell>
  );
}
