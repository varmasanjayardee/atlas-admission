"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CheckIcon, ChevronRightIcon, LockIcon } from "lucide-react";
import { ReuploadBanner } from "@/components/admission/next-action";
import { CounsellorCard, FeeCard, VisitCard } from "@/components/admission/summary-cards";
import { cn } from "@/lib/utils";
import {
  canOpenStep,
  endedTitle,
  getCurrentStep,
  getStepState,
  isEnded,
  JOURNEY_PARTS,
  JOURNEY_STEPS,
  TOTAL_STEPS,
  type JourneyStep,
  type StepState,
} from "@/lib/journey";
import type { Admission } from "@/types/admission.types";

const pad = (n: number) => String(n).padStart(2, "0");
const partLetter = (p: number) => String.fromCharCode(65 + p);
const partIndexOf = (step: number) => JOURNEY_PARTS.findIndex((part) => (part.steps as readonly number[]).includes(step));

/**
 * The journey as a page: where you are and the one thing to do, then the ten steps as cards
 * grouped by part, the current one open. Each step opens as its own page (/journey/N).
 */
export function JourneyList({ admission }: { admission: Admission }) {
  const current = getCurrentStep(admission);
  const done = JOURNEY_STEPS.filter((s) => getStepState(s.number, admission) === "done").length;
  const [openStep, setOpenStep] = useState<number | null>(current.number);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <ReuploadBanner admission={admission} />
      <Hero admission={admission} step={current} />

      <div className="grid gap-3 sm:grid-cols-3">
        <VisitCard visit={admission.visit} />
        <CounsellorCard counsellor={admission.counsellor} />
        <FeeCard childId={admission.child?.id} />
      </div>

      <section aria-labelledby="journey-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="journey-heading" className="text-2xl font-bold tracking-tight">
            Your journey
          </h2>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground tabular-nums">
            {done} of {TOTAL_STEPS} done
          </span>
        </div>

        {JOURNEY_PARTS.map((part, p) => (
          <div key={part.label}>
            <div className="mt-7 mb-3 flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-navy font-serif text-base text-white italic">{partLetter(p)}</span>
              <h3 className="font-semibold">{part.label}</h3>
              <span className="text-sm text-muted-foreground tabular-nums">
                Steps {part.steps[0]} to {part.steps[part.steps.length - 1]}
              </span>
            </div>
            <ol className="flex flex-col gap-3">
              {part.steps.map((n) => (
                <StepCard
                  key={n}
                  step={JOURNEY_STEPS[n - 1]}
                  state={getStepState(n, admission)}
                  next={!isEnded(admission) && n === admission.currentStep + 1}
                  open={openStep === n}
                  onToggle={() => setOpenStep(openStep === n ? null : n)}
                />
              ))}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}

function Hero({ admission, step }: { admission: Admission; step: JourneyStep }) {
  const p = partIndexOf(step.number);
  const ended = endedTitle(admission);
  const Icon = step.icon;

  return (
    <section className="grid items-end gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
          Where you are · Part {partLetter(p)} · {JOURNEY_PARTS[p].label}
        </p>
        <p className="mt-2 text-6xl leading-none font-bold tracking-tighter tabular-nums sm:text-7xl">
          Step {step.number}
          <span className="ml-2 text-2xl font-medium tracking-normal text-muted-foreground">of {TOTAL_STEPS}</span>
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{ended ?? step.action.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {step.title} · Enquiry made on {format(parseISO(admission.enquiryDate), "d MMMM yyyy")}
        </p>

        {/* Ten segments; the part labels sit under their share of them (4, 3, 3) */}
        <div className="mt-6 grid grid-cols-10 gap-1.5" aria-label={`${step.number - 1} of ${TOTAL_STEPS} steps done`} role="img">
          {JOURNEY_STEPS.map((s) => {
            const state = getStepState(s.number, admission);
            return (
              <span
                key={s.number}
                className={cn("h-1.5 rounded-full", state === "done" ? "bg-green-600" : state === "current" ? "bg-primary" : "bg-muted-foreground/20")}
              />
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-10 gap-1.5 text-xs font-medium text-muted-foreground" aria-hidden>
          {JOURNEY_PARTS.map((part) => (
            <span key={part.label} style={{ gridColumn: `span ${part.steps.length}` }}>
              {part.label}
            </span>
          ))}
        </div>
      </div>

      {!ended && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/25">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1 basis-48">
            <h2 className="text-lg font-semibold">{step.action.title}</h2>
            <p className="mt-1 text-sm text-primary-foreground/85">{step.description}</p>
          </div>
          <Link
            href={`/journey/${step.number}`}
            className="w-full rounded-full bg-primary-foreground px-5 py-2.5 text-center font-semibold text-primary transition-colors hover:bg-primary-foreground/90 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none sm:w-auto"
          >
            {step.action.cta}
          </Link>
        </div>
      )}
    </section>
  );
}

function StepCard({ step, state, next, open, onToggle }: { step: JourneyStep; state: StepState; next: boolean; open: boolean; onToggle: () => void }) {
  const bodyId = `step-${step.number}-body`;
  // Help page, with this step's checklist opened
  const needsButton = (
    <Link
      href={`/help#step-${step.number}`}
      className="inline-flex rounded-full border bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      What I&apos;ll need
    </Link>
  );

  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={cn("overflow-hidden rounded-2xl border bg-card transition-shadow", state === "current" && "border-primary ring-3 ring-primary/15")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="grid w-full grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3 p-4 text-left outline-none focus-visible:bg-muted/50 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-5"
      >
        <span
          className={cn(
            "text-4xl leading-none font-bold tracking-tighter tabular-nums sm:text-5xl",
            state === "done" ? "text-green-600" : state === "current" ? "text-primary" : "text-muted-foreground/40"
          )}
        >
          {pad(step.number)}
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-semibold">{step.title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{step.description}</span>
        </span>
        <span className="col-span-full flex items-center gap-2 sm:col-span-1">
          <StatePill state={state} next={next} />
          <ChevronRightIcon className={cn("size-5 text-muted-foreground/60 transition-transform", open && "rotate-90")} />
        </span>
      </button>

      {open && (
        <div id={bodyId} className="border-t px-4 pt-4 pb-5 sm:pr-5 sm:pl-[6.75rem]">
          <h4 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">What happens at this step</h4>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
            {step.details.map((d) => (
              <li key={d} className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {d}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canOpenStep(state) ? (
              <Link
                href={`/journey/${step.number}`}
                className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {state === "current" ? step.action.cta : "View details"}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                {state === "closed" ? "This step won't open for this application." : `Opens once step ${step.number - 1} is complete.`}
              </p>
            )}
            {state !== "done" && state !== "closed" && needsButton}
          </div>

        </div>
      )}
    </li>
  );
}

function StatePill({ state, next }: { state: StepState; next: boolean }) {
  if (state === "done")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-full bg-green-600 text-white">
          <CheckIcon className="size-4" strokeWidth={2.75} />
        </span>
        Done
      </span>
    );
  const pill = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";
  if (state === "current") return <span className={cn(pill, "bg-primary/10 text-primary")}>You are here</span>;
  if (next) return <span className={cn(pill, "border bg-muted text-muted-foreground")}>Up next</span>;
  return (
    <span className={cn(pill, "border bg-muted text-muted-foreground")}>
      <LockIcon className="size-3" />
      {state === "closed" ? "Closed" : "Later"}
    </span>
  );
}
