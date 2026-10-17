import AppHeader from "./app-header.js";
import AppFooter from "./app-footer.js";
import { InlineNotice } from "../inline-notice";

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   appearance: ReturnType<typeof import('@/data/use-appearance').useAppearance>,
 *   connected?: boolean,
 *   busy?: boolean,
 *   onDisconnect?: () => void,
 *   settingsOpen?: boolean,
 *   onSection?: (section: 'overview' | 'settings') => void,
 * }} props
 */
export default function AppShell({
  children,
  appearance,
  connected = false,
  busy = false,
  onDisconnect,
  settingsOpen = false,
  onSection,
}) {
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
        onSection={onSection}
      />
      <div className="app-content">
        <main>
          {appearance.error && <InlineNotice tone="warning">{appearance.error}</InlineNotice>}
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
