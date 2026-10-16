import { ui } from "@/lib/ui-text.js";

export default function LoadingState({ label = ui.loadingApp }) {
  return (
    <div
      className="loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img src="/pofi/pofi-full.webp" width="200" height="200" alt="" />
      <p>{label}</p>
    </div>
  );
}
