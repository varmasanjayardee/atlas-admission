"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATE_BADGE } from "@/components/admission/step-drawer";
import { StepContent } from "@/components/admission/steps";
import { useSelectedStudent } from "@/hooks/use-selected-student";
import { canOpenStep, getStepState, JOURNEY_STEPS, TOTAL_STEPS } from "@/lib/journey";
import { useAdmission } from "@/services/admission.service";

const pad = (n: number) => String(n).padStart(2, "0");

/** New journey view: a step as its own page (/journey/N), the same content as the classic drawer */
export function StepPage({ number }: { number: number }) {
  const router = useRouter();
  const { student, isLoading: loadingStudents } = useSelectedStudent();
  const { data: admission, isLoading } = useAdmission(loadingStudents ? undefined : (student?.id ?? "new"));
  const step = JOURNEY_STEPS[number - 1];

  if (loadingStudents || isLoading) return <div className="mx-auto h-[32rem] max-w-6xl animate-pulse rounded-2xl bg-muted" aria-busy />;

  const state = step && admission && getStepState(step.number, admission);
  const back = (
    <Link href="/" className="-ml-1 inline-flex items-center gap-0.5 rounded-md px-1 py-1 text-sm font-medium text-primary hover:underline">
      <ChevronLeftIcon className="size-4" />
      Back to your journey
    </Link>
  );

  if (!step || !admission || !state || !canOpenStep(state))
    return (
      <div className="mx-auto max-w-6xl">
        {back}
        <p className="mt-4 rounded-2xl bg-muted p-6 text-muted-foreground">
          {step ? `${step.title} opens once the steps before it are done.` : "There's no such step."}
        </p>
      </div>
    );

  const goNext = () => router.push(step.number < TOTAL_STEPS ? `/journey/${step.number + 1}` : "/");

  return (
    <div className="mx-auto max-w-6xl">
      {back}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground tabular-nums">
            Step {pad(step.number)} of {pad(TOTAL_STEPS)}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{step.title}</h1>
        </div>
        <Badge variant={STATE_BADGE[state].variant}>{STATE_BADGE[state].label}</Badge>
      </div>

      <div className="mt-6 flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
        <StepContent key={step.number} admission={admission} step={step} state={state} goNext={goNext} page />
      </div>
    </div>
  );
}
