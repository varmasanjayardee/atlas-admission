import type { Metadata } from "next";
import { Suspense } from "react";
import { FeesScreen } from "@/components/portal/fees-screen";

export const metadata: Metadata = { title: "Fees" };

export default function FeesPage() {
  // The picked campus, year and year group live in the URL (?campus=&year=&grade=)
  return (
    <Suspense>
      <FeesScreen />
    </Suspense>
  );
}
