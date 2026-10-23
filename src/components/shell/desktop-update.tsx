"use client";

import { useEffect, useState } from "react";
import Modal from "../modal.js";
import { ui } from "@/lib/ui-text.js";
import "./desktop-update.css";

export type DesktopUpdate = { currentVersion: string; version: string; platform: "win32" | "darwin" | "linux"; command: string };
declare global {
  interface Window {
    pofisUpdates?: {
      get: () => Promise<DesktopUpdate | null>;
      copyCommand: () => Promise<void>;
      subscribe: (callback: (update: DesktopUpdate) => void) => () => void;
    };
  }
}

export function useDesktopUpdate() {
  const [update, setUpdate] = useState<DesktopUpdate | null>(null);
  useEffect(() => {
    const bridge = window.pofisUpdates;
    if (!bridge) return;
    let active = true;
    const receive = (next: DesktopUpdate | null) => {
      if (active && next) setUpdate(next);
    };
    const unsubscribe = bridge.subscribe(receive);
    bridge.get().then(receive).catch(() => console.warn(ui.diagnostics.updateLoadFailed));
    return () => { active = false; unsubscribe(); };
  }, []);
  return update;
}

export function DesktopUpdateModal({ update, onClose, onOpenChangelog }: {
  update: DesktopUpdate;
  onClose: () => void;
  onOpenChangelog: (version: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  async function copy() {
    setStatus("copying");
    try {
      if (!window.pofisUpdates) throw new Error(ui.desktop.bridgeMissing);
      await window.pofisUpdates.copyCommand();
      setStatus("copied");
    } catch {
      console.warn(ui.diagnostics.updateCopyFailed);
      setStatus("error");
    }
  }
  const text = ui.desktopUpdate;
  return <Modal title={text.title} onClose={onClose} className="desktop-update-modal"
    description={text.versions(update.currentVersion, update.version)}>
    <div className="desktop-update-content">
      <p>{text.instruction(update.platform === "win32" ? ui.desktop.powershell : ui.desktop.terminal)}</p>
      <code className="desktop-update-command">{update.command}</code>
      <p>{text.confirmation}</p>
      <button type="button" className="text-button desktop-update-history"
        onClick={() => onOpenChangelog(update.version)}>{text.changes}</button>
      <div className="desktop-update-actions">
        <button type="button" className="primary" disabled={status === "copying"} onClick={copy}>
          {status === "copied" ? text.copied : status === "copying" ? text.copying : text.copy}
        </button>
        <button type="button" className="text-button" onClick={onClose}>{text.later}</button>
      </div>
      <p className={status === "error" ? "desktop-update-status" : "visually-hidden"} role="status">
        {status === "copied" ? text.copied : status === "error" ? text.copyError : ""}
      </p>
    </div>
  </Modal>;
}
