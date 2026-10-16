"use client";

import { useEffect, useId, useRef, useState } from "react";
import { product, ui } from "@/lib/ui-text.js";
import Icon from "../ui-icon.js";
import ThemeSwitch from "./theme-switch.js";

const sections = [{ id: "overview", label: ui.overview, icon: "layout" }];

export default function AppHeader({
  connected,
  busy,
  onDisconnect,
  navigation,
  appearance,
  section = "overview",
  settingsOpen = false,
  onSection,
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
                {sections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={section === item.id ? "page" : undefined}
                    onClick={() => selectSection(item.id)}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
            {navigation}
            {onSection && (
              <div className="sidebar-nav settings-nav">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={settingsOpen}
                  onClick={() => selectSection("settings")}
                >
                  <Icon name="settings" />
                  {ui.settings}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="header-actions">
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
