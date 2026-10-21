import AppHeader from "./app-header.js";
import AppFooter from "./app-footer.js";
import { InlineNotice } from "../inline-notice";
import { useState } from "react";
import { DesktopUpdateModal, useDesktopUpdate } from "./desktop-update";

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   appearance: ReturnType<typeof import('@/data/use-appearance').useAppearance>,
 *   connected?: boolean,
 *   busy?: boolean,
 *   onDisconnect?: () => void,
 *   settingsOpen?: boolean,
 *   mealsOpen?: boolean,
 *   showMeals?: boolean,
 *   onSection?: (section: 'overview' | 'settings' | 'meals') => void,
 * }} props
 */
export default function AppShell({
  children,
  appearance,
  connected = false,
  busy = false,
  onDisconnect,
  settingsOpen = false,
  mealsOpen = false,
  showMeals = false,
  onSection,
}) {
  const update = useDesktopUpdate();
  const [updateOpen, setUpdateOpen] = useState(false);
  return (
    <div
      className={["app-shell", !connected && "app-shell-public"]
        .filter(Boolean)
        .join(" ")}
    >
      <AppHeader
        appearance={appearance}
        connected={connected}
        busy={busy}
        onDisconnect={onDisconnect}
        settingsOpen={settingsOpen}
        mealsOpen={mealsOpen}
        showMeals={showMeals}
        onSection={onSection}
        updateAvailable={!!update}
        onOpenUpdate={() => setUpdateOpen(true)}
      />
      <div className="app-content">
        <main>
          {appearance.error && <InlineNotice tone="warning">{appearance.error}</InlineNotice>}
          {children}
        </main>
        <AppFooter updateAvailable={!connected && !!update} onOpenUpdate={() => setUpdateOpen(true)} />
      </div>
      {updateOpen && update && <DesktopUpdateModal update={update} onClose={() => setUpdateOpen(false)} />}
    </div>
  );
}
