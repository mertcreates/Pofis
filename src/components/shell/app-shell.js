import AppHeader from "./app-header.js";
import AppFooter from "./app-footer.js";
import { InlineNotice } from "../inline-notice";
import { useState } from "react";
import { DesktopUpdateModal, useDesktopUpdate } from "./desktop-update";
import { NotificationSettings } from "../notifications/settings";
import { ChangelogHistory } from "../changelog/history";

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   appearance: ReturnType<typeof import('@/data/use-appearance').useAppearance>,
 *   connected?: boolean,
 *   busy?: boolean,
 *   onDisconnect?: () => void,
 *   notifications?: import('../notifications/settings').NotificationSettingsSource,
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
  notifications,
  settingsOpen = false,
  mealsOpen = false,
  showMeals = false,
  onSection,
}) {
  const update = useDesktopUpdate();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("content");
  const [changelogVersion, setChangelogVersion] = useState();
  const [changelogOpening, setChangelogOpening] = useState(0);
  const notificationsOpen = connected && activeSection === "notifications";
  const changelogOpen = activeSection === "changelog";
  function openChangelog(version) {
    setChangelogVersion(version);
    setActiveSection("changelog");
  }
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
        onSection={(section) => { setActiveSection("content"); onSection?.(section); }}
        updateAvailable={!!update}
        onOpenUpdate={() => setUpdateOpen(true)}
        showNotifications={!!notifications}
        notificationsOpen={notificationsOpen}
        onOpenNotifications={() => setActiveSection("notifications")}
      />
      <div className="app-content" data-changelog-open={changelogOpen || undefined}>
        <main>
          {appearance.error && <InlineNotice tone="warning">{appearance.error}</InlineNotice>}
          <div hidden={notificationsOpen || changelogOpen}>{children}</div>
          {connected && notifications && <NotificationSettings visible={notificationsOpen} source={notifications} />}
          {changelogOpen && <ChangelogHistory targetVersion={changelogVersion} opening={changelogOpening}
            onBack={connected ? undefined : () => setActiveSection("content")} />}
        </main>
        <AppFooter updateAvailable={!connected && !!update} onOpenUpdate={() => setUpdateOpen(true)}
          onOpenChangelog={openChangelog} />
      </div>
      {updateOpen && update && <DesktopUpdateModal update={update} onClose={() => setUpdateOpen(false)}
        onOpenChangelog={(version) => {
          setUpdateOpen(false);
          openChangelog(version);
          // The modal can reopen the same version while history is already visible.
          setChangelogOpening((opening) => opening + 1);
        }} />}
    </div>
  );
}
