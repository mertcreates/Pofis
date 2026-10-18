"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { content } from "@/content";

export function InstallCard() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content.install.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement("textarea");
      textArea.value = content.install.command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <>
      <div className="install-card">
        <span className="install-label">{content.install.label}</span>
        <div className="install-row">
          <code className="install-cmd">{content.install.command}</code>
          <button
            type="button"
            className={`copy-btn ${copied ? "copied" : ""}`}
            aria-label={copied ? content.install.copySuccessMessage : content.install.copyAriaLabel}
            onClick={handleCopy}
            title={copied ? content.install.copySuccessMessage : content.install.copyAriaLabel}
          >
            {copied ? (
              <Check size={16} strokeWidth={2.2} />
            ) : (
              <Copy size={16} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      <p className="hint-text">
        {content.install.hint} Ayrıntılar için{" "}
        <a
          href={content.install.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content.install.docsLabel}
        </a>{" "}
        bak.
      </p>
    </>
  );
}
