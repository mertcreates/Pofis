import { MiniDashboard } from "@/components/mini/mini-dashboard";

export const dynamic = "force-dynamic";

export default function MiniPage() {
  return <MiniDashboard initialNow={Date.now()} />;
}
