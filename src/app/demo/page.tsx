import type { Metadata } from "next";
import { DemoDashboard } from "@/demo/dashboard";
import { demoData } from "@/demo/report";

export const metadata: Metadata = {
  title: "Pofis · Demo",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoDashboard {...demoData()} />;
}
