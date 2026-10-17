import { SESSION_POLICY } from "@/domain/rules/session-policy";
import Image from "next/image";
import { ui } from "@/lib/ui-text.js";
import RequestError from "./request-error.js";
import type { RequestFailure } from "@/lib/pdks-failure";
import { memo, useEffect, useRef } from "react";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { presentPdksFailure } from "./pdks-error-presentation";

export const Connection = memo(function Connection({
  busy,
  error,
  onRetry,
  onReturnToLogin,
  onConnect,
}: {
  busy: boolean;
  error: RequestFailure | null;
  onRetry: () => void;
  onReturnToLogin: () => void;
  onConnect: (form: HTMLFormElement) => Promise<void>;
}) {
  const password = useRef<HTMLInputElement>(null);
  const fieldError = error?.operation === "connect"
    && (error.kind === "credentials" || error.kind === "validation");
  const systemError = error && !fieldError && error.kind !== "session-expired";
  useEffect(() => {
    if (fieldError) password.current?.focus();
  }, [error, fieldError]);
  if (systemError) {
    return <RequestError error={error} onRetry={onRetry} busy={busy}
      onReturnToLogin={error.operation === "connect" ? onReturnToLogin : undefined} />;
  }
  const errorMessage = fieldError && (
    <div id="connection-error" className="connection-field-message">
      <RequestError error={error} variant="field" />
    </div>
  );
  return (
    <section className="connection" aria-labelledby="connection-title">
      <div className="connection-brand">
        <Image
          src={busy ? POFI_ASSETS.working : POFI_ASSETS.idle}
          className="connection-mascot"
          width={240}
          height={240}
          alt="Pofi"
          priority
        />
      </div>
      <div className="dashboard-card connection-form">
        <h1 id="connection-title">{ui.connect}</h1>
        {error?.kind === "session-expired" && (
          <p className="connection-session-message" role="status">{presentPdksFailure(error).message}</p>
        )}
        <form
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            void onConnect(event.currentTarget);
          }}
        >
          <label>
            {ui.username}
            <input
              name="username"
              aria-invalid={fieldError || undefined}
              aria-describedby={fieldError ? "connection-error" : undefined}
              autoComplete="username"
              placeholder="kullanici.adi"
              required
              maxLength={SESSION_POLICY.maxUsernameLength}
              disabled={busy}
            />
          </label>
          <label>
            {ui.password}
            <input
              ref={password}
              name="password"
              aria-invalid={fieldError || undefined}
              aria-describedby={fieldError ? "connection-error" : undefined}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              maxLength={SESSION_POLICY.maxPasswordLength}
              disabled={busy}
            />
          </label>
          {fieldError && errorMessage}
          <button className="primary full" disabled={busy}>
            {busy ? ui.verifyingSession : ui.connect}
          </button>
        </form>
      </div>
    </section>
  );
});
