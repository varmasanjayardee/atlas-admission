import type { Metadata } from "next";
import { VisitorApprove } from "@/components/admission/visitor-approve";

export const metadata: Metadata = { title: "Visitor check-in", robots: { index: false } };

// ponytail: gate staff tool until the visitor dashboard exists; protected by the gate key
export default function VisitorApprovePage() {
  return (
    <main className="min-h-dvh bg-muted/60 px-4 py-10">
      <VisitorApprove />
    </main>
  );
}
