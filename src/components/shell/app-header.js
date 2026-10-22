"use client";

import { useEffect, useId, useRef, useState } from "react";
import { product, ui } from "@/lib/ui-text.js";
import Icon from "../ui-icon.js";
import ThemeSwitch from "./theme-switch.js";

export default function AppHeader({
  connected,
  busy,
  onDisconnect,
  appearance,
  settingsOpen = false,
  mealsOpen = false,
  showMeals = false,
  onSection,
  updateAvailable = false,
  onOpenUpdate,
  showNotifications = false,
  notificationsOpen = false,
  onOpenNotifications,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef(null);
  const menuButton = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    const onPointerDown = (event) => {
      if (headerRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);
  function selectSection(nextSection) {
    if (menuOpen) {
      setMenuOpen(false);
      menuButton.current?.focus({ preventScroll: true });
    }
    onSection(nextSection);
  }
  let menuLabel = ui.openMenu;
  if (menuOpen) menuLabel = ui.closeMenu;
  return (
    <header className="app-header" ref={headerRef}>
      <a className="wordmark" href="/">
        <img src="/pofi/pofi-mark-256.png" width="36" height="36" alt="" />
        <span>
          {product.wordmark}
          <span className="brand-dot">.</span>
        </span>
      </a>
      {connected && (
        <button
          className="mobile-menu-toggle"
          type="button"
          ref={menuButton}
          aria-label={menuLabel}
          title={menuLabel}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((previous) => !previous)}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
      )}
      <div
        className="header-menu"
        id={menuId}
        data-open={menuOpen}
        onClick={(event) => {
          if (event.target.closest("a")) setMenuOpen(false);
        }}
      >
        {connected && (
          <div className="sidebar-menu">
            {onSection && (
              <nav className="sidebar-nav" aria-label={ui.mainMenu}>
                <button
                  type="button"
                  aria-current={!notificationsOpen ? "page" : undefined}
                  onClick={() => selectSection("overview")}
                >
                  <Icon name="layout" />
                  {ui.overview}
                </button>
                {showMeals && <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={mealsOpen}
                  onClick={() => selectSection("meals")}
                >
                  <Icon name="utensils" />
                  {ui.meals.nav}
                </button>}
              </nav>
            )}
            {onSection && (
              <div className="sidebar-nav settings-nav">
                {showNotifications && <button type="button" aria-current={notificationsOpen ? "page" : undefined}
                  onClick={() => {
                    if (menuOpen) menuButton.current?.focus({ preventScroll: true });
                    setMenuOpen(false); onOpenNotifications();
                  }}><Icon name="bell" />{ui.notifications.title}</button>}
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={settingsOpen}
                  onClick={() => selectSection("settings")}
                >
                  <Icon name="calendar" />
                  {ui.settings}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="header-actions">
          {connected && updateAvailable && <button type="button" className="text-button desktop-update-trigger"
            aria-haspopup="dialog" onClick={() => {
              if (menuOpen) menuButton.current?.focus({ preventScroll: true });
              setMenuOpen(false);
              onOpenUpdate();
            }}>
            <Icon name="refresh" />{ui.desktopUpdate.available}
          </button>}
          <ThemeSwitch
            label={connected ? ui.theme.appearance : undefined}
            theme={appearance.theme}
            ready={appearance.ready}
            onToggle={() =>
              appearance.save(appearance.theme === "dark" ? "light" : "dark")
            }
          />
          {connected && onDisconnect && (
            <button
              className="text-button"
              onClick={() => {
                setMenuOpen(false);
                onDisconnect();
              }}
              disabled={!!busy}
              type="button"
            >
              <Icon name="logout" />
              {ui.disconnect}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
