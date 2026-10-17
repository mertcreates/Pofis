import AppHeader from "./app-header.js";
import AppFooter from "./app-footer.js";
import { InlineNotice } from "../inline-notice";

export default function AppShell({
  children,
  appearance,
  navigation = null,
  connected = false,
  busy = false,
  onDisconnect,
  showNavigation = true,
  section = "overview",
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
        navigation={connected && showNavigation ? navigation : null}
        section={section}
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
