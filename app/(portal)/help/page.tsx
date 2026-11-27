import type { Metadata } from "next";
import { HelpScreen } from "@/components/portal/help-screen";

export const metadata: Metadata = { title: "FAQ" };

export default function HelpPage() {
  return <HelpScreen />;
}
