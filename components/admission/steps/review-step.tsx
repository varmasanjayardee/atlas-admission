"use client";

import { format, parseISO } from "date-fns";
import { CheckIcon, CircleCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Child } from "@/schemas/auth.schema";
import { StepBody, StepFooter, type StepContentProps } from "./step-layout";

type RowState = "done" | "current" | "upcoming" | "good" | "bad";

interface Row {
  title: string;
  /** ISO date, shown on the right */
  at?: string | null;
  /** A short word (Now, Next) on the right instead of a date */
  word?: string;
  state: RowState;
}

// What the family sees for each review status; the dot on the card's pill carries the meaning
const DECISION = {
  pending: {
    label: "In review",
    dot: "bg-white",
    value: "Within 48 hours",
    body: "Of your campus visit. We'll notify you when your decision is available in MyArdee.",
  },
  waitlisted: {
    label: "Waiting list",
    dot: "bg-amber-400",
    value: "On the waiting list",
    body: "The grade is full right now. If a place opens, it's offered here first, so there's nothing you need to do.",
  },
  offered: {
    label: "Accepted",
    dot: "bg-green-400",
    value: "A place is offered",
    body: "Accept the offer in the next step to hold the place.",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-400",
    value: "Unable to offer a place",
    body: "Thank you for considering Ardee and for visiting us.",
  },
  not_offered: {
    label: "Not offered",
    dot: "bg-red-400",
    value: "No place this time",
    body: "This is usually down to the number of seats in the grade, not the application.",
  },
} as const;

// Declined or expired later, at the offer step: the review itself still offered a place
const reviewOutcome = (child: Child) =>
  child.outcome === "declined" || child.outcome === "withdrawn"
    ? "offered"
    : child.outcome;

function progress(child: Child): Row[] {
  const doneAt = (step: number) =>
    child.steps.find((s) => s.step === step)?.completed_at;
  const outcome = reviewOutcome(child);
  const decided = outcome !== "pending" && outcome !== "waitlisted";

  return [
    { title: "Application submitted", at: doneAt(1), state: "done" },
    { title: "Application fee paid", at: doneAt(2), state: "done" },
    { title: "Campus visit booked", at: doneAt(3), state: "done" },
    { title: "Campus visit completed", at: doneAt(4), state: "done" },
    // Only a test that happened: skipped (or Early Years) leaves no test date
    ...(doneAt(5) && child.aptitude_test_at
      ? [
          {
            title: "Aptitude test taken",
            at: doneAt(5),
            state: "done" as const,
          },
        ]
      : []),
    {
      title: "Admissions team review",
      ...(decided ? { at: child.reviewed_at ?? doneAt(6) } : { word: "Now" }),
      state: decided ? "done" : "current",
    },
    {
      title: decided ? DECISION[outcome].label : "Admissions decision",
      ...(decided ? { at: child.reviewed_at } : { word: "Next" }),
      state: !decided ? "upcoming" : outcome === "offered" ? "good" : "bad",
    },
  ];
}

/** Step 6: thanks for visiting, where the review stands, and the progress so far */
export function ReviewStep({ admission, goNext }: StepContentProps) {
  const child = admission.child!;
  const outcome = reviewOutcome(child);
  const decision = DECISION[outcome];
  const waiting = outcome === "pending" || outcome === "waitlisted";
  const rows = progress(child);
  const completed = rows.filter((r) => r.state === "done").length;

  return (
    <>
      <StepBody className="@container max-sm:px-4">
        <div className="grid gap-8 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:gap-12">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Admissions review
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-navy-ink sm:text-5xl">
                Thank you for visiting.
              </h2>
              <p className="mt-2 text-muted-foreground">
                It was a pleasure welcoming your family to Ardee. We hope you
                enjoyed experiencing our campus.
              </p>
            </div>

            <section
              className="rounded-3xl bg-navy p-6 text-white sm:p-8"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold tracking-wider uppercase">
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", decision.dot)}
                />
                {decision.label}
              </span>
              <p className="mt-4 text-2xl font-bold">
                {child.first_name}&apos;s application
              </p>
              {admission.campus && (
                <p className="mt-1 text-white/80">{admission.campus}</p>
              )}
              <div className="mt-6 border-t border-white/20 pt-6">
                <p className="text-xs font-bold tracking-wider text-white/80 uppercase">
                  Your decision
                </p>
                <p className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
                  {decision.value}
                </p>
                <p className="mt-2 text-white/80">{decision.body}</p>
                {child.review_note && (
                  <p className="mt-4 border-l-2 border-white/30 pl-4 whitespace-pre-line text-white/90">
                    {child.review_note}
                  </p>
                )}
              </div>
            </section>

            {waiting && (
              <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <CircleCheckIcon className="size-6" />
                </span>
                <div>
                  <p className="font-bold text-navy-ink">
                    No action needed right now
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll contact you if we need anything further.
                  </p>
                </div>
              </div>
            )}
          </div>

          <section className="@3xl:pt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-2xl font-bold text-navy-ink">
                Your progress
              </h3>
              <p className="text-sm font-bold text-muted-foreground tabular-nums">
                {completed} completed
              </p>
            </div>
            <ol className="mt-4" aria-label="Application progress">
              {rows.map((row, i) => (
                <li
                  key={row.title}
                  aria-current={row.state === "current" ? "step" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-3 sm:gap-4 sm:px-4",
                    row.state === "current" && "bg-primary/10",
                  )}
                >
                  {/* The connector down to the next row, while the journey has reached it */}
                  {i < rows.length - 1 && row.state === "done" && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-7 h-full w-0.5 -translate-x-1/2 bg-green-200 sm:left-8"
                    />
                  )}
                  <Marker state={row.state} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 font-bold",
                      row.state === "upcoming" &&
                        "font-normal text-muted-foreground",
                      row.state === "current" && "text-navy-ink",
                      row.state === "good" && "text-green-700",
                      row.state === "bad" && "text-red-700",
                    )}
                  >
                    {row.title}
                  </span>
                  {row.word ? (
                    <span
                      className={cn(
                        "shrink-0 text-xs font-bold tracking-wider uppercase",
                        row.state === "current"
                          ? "text-navy-ink"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.word}
                    </span>
                  ) : (
                    row.at && (
                      <time
                        dateTime={row.at}
                        className="shrink-0 text-sm text-muted-foreground tabular-nums"
                      >
                        {format(parseISO(row.at), "d MMM")}
                        <span className="max-sm:hidden">
                          {" "}
                          {format(parseISO(row.at), "yyyy")}
                        </span>
                      </time>
                    )
                  )}
                </li>
              ))}
            </ol>
          </section>

          {(outcome === "rejected" || outcome === "not_offered") && (
            <p className="text-sm text-muted-foreground">
              Questions about the decision? Call{" "}
              <a
                href={`tel:${site.helpLine}`}
                className="font-medium text-primary hover:underline"
              >
                {site.helpLine}
              </a>
              .
            </p>
          )}
        </div>
      </StepBody>

      {outcome === "offered" && (
        <StepFooter>
          <Button
            size="lg"
            className="h-12 rounded-xl text-base font-semibold"
            onClick={goNext}
          >
            Next: {JOURNEY_STEPS[6].title}
          </Button>
        </StepFooter>
      )}
    </>
  );
}

function Marker({ state }: { state: RowState }) {
  if (state === "current")
    return (
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-navy">
        <span className="size-3 rounded-full bg-white" />
      </span>
    );
  if (state === "upcoming")
    return (
      <span className="relative z-10 size-8 shrink-0 rounded-full border-2 border-border bg-card" />
    );
  return (
    <span
      className={cn(
        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
        state === "bad"
          ? "bg-red-50 text-red-700"
          : "bg-green-50 text-green-700",
      )}
    >
      {state === "bad" ? (
        <XIcon className="size-4" strokeWidth={3} />
      ) : (
        <CheckIcon className="size-4" strokeWidth={3} />
      )}
    </span>
  );
}
