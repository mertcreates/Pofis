import { ui } from "../../lib/ui-text.js";
import type { Metadata } from "next";
import { DemoDashboard } from "@/demo/dashboard";
import { demoData } from "@/demo/report";

export const metadata: Metadata = {
  title: ui.demoMessages.title,
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoDashboard {...demoData()} />;
}
