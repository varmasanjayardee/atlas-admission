import { Suspense } from "react";
import type { Metadata } from "next";
import { AdmissionHome, HomeSkeleton } from "@/components/admission/admission-home";

export const metadata: Metadata = { title: "Your admission" };

export default function HomePage() {
  return (
    // The open step drawer is read from ?step=, which needs a Suspense boundary
    <Suspense fallback={<HomeSkeleton />}>
      <AdmissionHome />
    </Suspense>
  );
}
