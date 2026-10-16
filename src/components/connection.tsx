import { SESSION_POLICY } from "@/domain/rules/session-policy";
import Image from "next/image";
import { ui } from "@/lib/ui-text.js";

export function Connection({
  busy,
  onConnect,
}: {
  busy: boolean;
  onConnect: (form: HTMLFormElement) => Promise<void>;
}) {
  return (
    <section className="connection" aria-labelledby="connection-title">
      <div className="connection-brand">
        <Image
          src={`/pofi/states/${busy ? "working" : "idle"}.webp`}
          className="connection-mascot"
          width={240}
          height={240}
          alt="Pofi"
          priority
        />
      </div>
      <div className="dashboard-card connection-form">
        <h1 id="connection-title">{ui.connect}</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onConnect(event.currentTarget);
          }}
        >
          <label>
            {ui.username}
            <input
              name="username"
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
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              maxLength={SESSION_POLICY.maxPasswordLength}
              disabled={busy}
            />
          </label>
          <button className="primary full" disabled={busy}>
            {busy ? ui.verifyingSession : ui.connect}
          </button>
        </form>
      </div>
    </section>
  );
}
