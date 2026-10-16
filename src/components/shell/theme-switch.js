"use client";
import { ui } from "@/lib/ui-text.js";
export default function ThemeSwitch({ label, theme, ready, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      className="theme-switch"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={ui.theme.label}
      onClick={onToggle}
      disabled={!ready}
    >
      {label && (
        <span className="theme-switch-label">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="8" />
            <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
          </svg>
          {label}
        </span>
      )}
      <span className="theme-switch-scene" aria-hidden="true">
        <svg className="theme-switch-stars" viewBox="0 0 28 28">
          <path d="M7 2Q7 7 12 7Q7 7 7 12Q7 7 2 7Q7 7 7 2Z" />
          <path d="M21 1Q21 5 25 5Q21 5 21 9Q21 5 17 5Q21 5 21 1Z" />
          <path d="M13 15Q13 20 18 20Q13 20 13 25Q13 20 8 20Q13 20 13 15Z" />
          <circle cx="3" cy="18" r="1" />
        </svg>
        <span className="theme-switch-orb">
          <span className="theme-switch-crater" />
          <span className="theme-switch-crater" />
          <span className="theme-switch-crater" />
          <span className="theme-switch-clouds" />
        </span>
      </span>
    </button>
  );
}
