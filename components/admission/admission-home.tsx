"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JourneyList } from "@/components/admission/journey-list";
import { JourneyMap } from "@/components/admission/journey-map";
import { NextAction, ReuploadBanner } from "@/components/admission/next-action";
import { StepDrawer } from "@/components/admission/step-drawer";
import { CounsellorCard, VisitCard } from "@/components/admission/summary-cards";
import { WhereYouAre } from "@/components/admission/where-you-are";
import { useSelectedStudent } from "@/hooks/use-selected-student";
import { useAdmission } from "@/services/admission.service";
import { useProfileStore } from "@/store/profile.store";

export function AdmissionHome() {
  const { student, isLoading: loadingStudents } = useSelectedStudent();
  // ponytail: no child on the enquiry yet -- parents add details in the journey, so show it anyway
  const { data: admission, isLoading, isError } = useAdmission(loadingStudents ? undefined : (student?.id ?? "new"));
  // Chosen in the profile menu; the new step list unless the parent picked the classic map
  const view = useProfileStore((s) => s.journeyView);
  const router = useRouter();
  const params = useSearchParams();

  // New view: steps are pages. Links to ?step=N (payment return, re-upload, profile) go there
  const requested = view !== "classic" && params.get("step");
  useEffect(() => {
    if (!requested) return;
    const rest = new URLSearchParams(params);
    rest.delete("step");
    router.replace(`/journey/${requested}${rest.size ? `?${rest}` : ""}`);
  }, [requested, params, router]);

  if (loadingStudents || isLoading) return <HomeSkeleton />;

  if (isError || !admission) {
    return (
      <p className="rounded-2xl bg-muted p-6 text-muted-foreground">
        Your admission details could not be loaded. Refresh the page, or message your counsellor if it
        keeps happening.
      </p>
    );
  }

  if (view !== "classic")
    return (
      <>
        <JourneyList admission={admission} />
      </>
    );

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-16">
      {/* 1. Details */}
      <div className="flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
        <ReuploadBanner admission={admission} />
        <WhereYouAre admission={admission} />
        <div className="grid grid-cols-2 gap-3">
          <VisitCard visit={admission.visit} />
          <CounsellorCard counsellor={admission.counsellor} />
        </div>
        <NextAction admission={admission} />
      </div>

      {/* 2. Journey */}
      <JourneyMap admission={admission} />

      <StepDrawer admission={admission} />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="grid animate-pulse gap-10 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-16" aria-busy>
      <div className="flex flex-col gap-6">
        <div className="h-64 rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-36 rounded-2xl bg-muted" />
          <div className="h-36 rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="h-[40rem] rounded-3xl bg-muted" />
    </div>
  );
}
