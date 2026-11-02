import { Suspense } from "react";
import type { Metadata } from "next";
import { StepPage } from "@/components/admission/step-page";
import { TOTAL_STEPS } from "@/lib/journey";

export const metadata: Metadata = { title: "Your admission" };

// Ten fixed steps: prerender each, so the URL is known at build time
export function generateStaticParams() {
  return Array.from({ length: TOTAL_STEPS }, (_, i) => ({ step: String(i + 1) }));
}

export default async function JourneyStepPage({ params }: PageProps<"/journey/[step]">) {
  const { step } = await params;
  return (
    // Steps read the URL (e.g. ?payment= after paying), which needs a Suspense boundary
    <Suspense fallback={<div className="mx-auto h-[32rem] max-w-6xl animate-pulse rounded-2xl bg-muted" />}>
      <StepPage number={Number(step)} />
    </Suspense>
  );
}
