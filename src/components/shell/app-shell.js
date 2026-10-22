import AppHeader from "./app-header.js";
import AppFooter from "./app-footer.js";
import { InlineNotice } from "../inline-notice";
import { useState } from "react";
import { DesktopUpdateModal, useDesktopUpdate } from "./desktop-update";
import { NotificationSettings } from "../notifications/settings";

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
        onSection={(section) => { setNotificationsOpen(false); onSection?.(section); }}
        updateAvailable={!!update}
        onOpenUpdate={() => setUpdateOpen(true)}
        showNotifications={!!notifications}
        notificationsOpen={notificationsOpen}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
      <div className="app-content">
        <main>
          {appearance.error && <InlineNotice tone="warning">{appearance.error}</InlineNotice>}
          <div hidden={connected && notificationsOpen}>{children}</div>
          {connected && notifications && <NotificationSettings visible={notificationsOpen} source={notifications} />}
        </main>
        <AppFooter updateAvailable={!connected && !!update} onOpenUpdate={() => setUpdateOpen(true)} />
      </div>
      {updateOpen && update && <DesktopUpdateModal update={update} onClose={() => setUpdateOpen(false)} />}
    </div>
  );
}
