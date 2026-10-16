"use client";
import { useState } from "react";
import AppShell from "@/components/shell/app-shell.js";
import { useAppearance } from "@/data/use-appearance";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { product, ui } from "@/lib/ui-text.js";

export default function NotFound() {
  const appearance = useAppearance();
  const [revealed, setRevealed] = useState(false);
  return (
    <AppShell
      appearance={appearance}
      showNavigation={false}
      onDisconnect={undefined}
      onSection={undefined}
    >
      <section className="empty not-found">
        <button
          type="button"
          className="pofi-trigger"
          aria-label={product.mascotName}
          onClick={() => setRevealed(true)}
        >
          <img src={POFI_ASSETS.tired} width="180" height="180" alt="" />
        </button>
        <h1>{ui.notFound}</h1>
        {revealed && (
          <p role="status" className="pofi-room-note">
            {ui.pofiWrongDoor}
          </p>
        )}
        <a className="button-link primary" href="/">
          {ui.returnSelf}
        </a>
      </section>
    </AppShell>
  );
}
