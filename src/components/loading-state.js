import { ui } from "@/lib/ui-text.js";
import PofiIdle from "./pofi/idle";

export default function LoadingState({ label = ui.loadingApp }) {
  return (
    <div
      className="loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <PofiIdle width={200} height={200} alt="" />
      <p>{label}</p>
    </div>
  );
}
