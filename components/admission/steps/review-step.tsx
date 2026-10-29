"use client";

import { format, parseISO } from "date-fns";
import { CheckIcon, CircleAlertIcon, CircleCheckIcon, HourglassIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Child } from "@/schemas/auth.schema";
import { StepBody, StepFooter, type StepContentProps } from "./step-layout";

type NodeState = "done" | "current" | "upcoming" | "good" | "bad";

interface Node {
  title: string;
  detail?: string;
  state: NodeState;
}

// What the family sees for each review status
const DECISION = {
  pending: {
    label: "In review",
    icon: HourglassIcon,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    title: (name: string) => `${name}'s application is in review`,
    body: "The admissions team is looking at the application and the campus visit together. This page updates as soon as there's a decision.",
  },
  waitlisted: {
    label: "Waiting list",
    icon: HourglassIcon,
    tone: "bg-sky-50 text-sky-900 ring-sky-200",
    title: (name: string) => `${name} is on the waiting list`,
    body: "The application was strong, but the grade is full right now. If a place opens, it's offered here first, so there's nothing you need to do.",
  },
  offered: {
    label: "Accepted",
    icon: CircleCheckIcon,
    tone: "bg-green-50 text-green-800 ring-green-200",
    title: (name: string) => `${name} has been offered a place`,
    body: "Accept the offer in the next step to hold the seat.",
  },
  rejected: {
    label: "Rejected",
    icon: XIcon,
    tone: "bg-red-50 text-red-800 ring-red-200",
    title: () => "We're unable to offer a place",
    body: "Thank you for considering Ardee and for visiting us.",
  },
  not_offered: {
    label: "Not offered",
    icon: CircleAlertIcon,
    tone: "bg-orange-50 text-orange-800 ring-orange-200",
    title: () => "A place can't be offered this time",
    body: "This is usually down to the number of seats in the grade, not the application.",
  },
} as const;

const when = (iso?: string) => (iso ? format(parseISO(iso), "d MMM yyyy") : undefined);

function timeline(child: Child): Node[] {
  const doneAt = (step: number) => child.steps.find((s) => s.step === step)?.completed_at;
  const decided = child.outcome !== "pending" && child.outcome !== "waitlisted";
  const decision = DECISION[child.outcome as keyof typeof DECISION];

  return [
    { title: "Application submitted", detail: when(doneAt(1)), state: "done" },
    { title: "Registration fee paid", detail: when(doneAt(2)), state: "done" },
    { title: "Campus visit booked", detail: when(doneAt(3)), state: "done" },
    { title: "Visited the campus", detail: when(doneAt(4)), state: "done" },
    {
      title: "In review with the admissions team",
      detail: decided
        ? `Finished ${when(child.reviewed_at ?? doneAt(5)) ?? ""}`
        : child.outcome === "waitlisted"
          ? "On the waiting list"
          : "Happening now",
      state: decided ? "done" : "current",
    },
    {
      title: decided ? (decision?.label ?? "Decision") : "Decision",
      detail: decided ? when(child.reviewed_at ?? undefined) : "Accepted, waiting list, rejected or not offered",
      state: !decided ? "upcoming" : child.outcome === "offered" ? "good" : "bad",
    },
  ];
}

/** Step 5: where the application stands, as a vertical timeline, and the decision once there is one */
export function ReviewStep({ admission, goNext }: StepContentProps) {
  const child = admission.child!;
  const name = child.first_name;
  const decision = DECISION[child.outcome as keyof typeof DECISION] ?? DECISION.pending;
  const Icon = decision.icon;
  const nodes = timeline(child);
  // The line fills to the last reached point
  const reached = nodes.findLastIndex((n) => n.state !== "upcoming");
  const fill = (reached / (nodes.length - 1)) * 100;

  return (
    <>
      <StepBody>
        <section className={cn("rounded-2xl p-5 ring-1", decision.tone)} aria-live="polite">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
            <Icon className="size-3.5" />
            {decision.label}
          </span>
          <h3 className="mt-3 text-xl leading-snug font-bold tracking-tight">{decision.title(name)}</h3>
          <p className="mt-1 text-sm opacity-90">{decision.body}</p>
          {child.review_note && (
            <blockquote className="mt-4 border-l-2 border-current/30 pl-3 text-sm italic">{child.review_note}</blockquote>
          )}
        </section>

        <ol className="relative pl-1" aria-label="Application progress">
          {/* Track, and the fill that grows down it once */}
          <span aria-hidden className="absolute top-3 bottom-3 left-[1.0625rem] w-0.5 rounded-full bg-border" />
          <span
            aria-hidden
            className="absolute top-3 left-[1.0625rem] w-0.5 origin-top rounded-full bg-primary transition-transform duration-[900ms] ease-[cubic-bezier(0.3,0.7,0.2,1)] starting:scale-y-0 motion-reduce:transition-none"
            style={{ height: `calc((100% - 1.5rem) * ${fill / 100})` }}
          />

          {nodes.map((node) => (
            <li
              key={node.title}
              aria-current={node.state === "current" ? "step" : undefined}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              <Dot state={node.state} />
              <div className="pt-1.5">
                <p
                  className={cn(
                    "font-medium",
                    node.state === "upcoming" && "text-muted-foreground",
                    node.state === "good" && "text-green-700",
                    node.state === "bad" && "text-red-700"
                  )}
                >
                  {node.title}
                </p>
                {node.detail && <p className="text-sm text-muted-foreground">{node.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        {(child.outcome === "rejected" || child.outcome === "not_offered") && (
          <p className="text-sm text-muted-foreground">
            Questions about the decision? Email{" "}
            <a href={`mailto:${site.helpEmail}`} className="font-medium text-primary hover:underline">
              {site.helpEmail}
            </a>
            .
          </p>
        )}
      </StepBody>

      {child.outcome === "offered" && (
        <StepFooter>
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {JOURNEY_STEPS[5].title}
          </Button>
        </StepFooter>
      )}
    </>
  );
}

function Dot({ state }: { state: NodeState }) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-popover",
        state === "done" && "bg-primary text-primary-foreground",
        state === "current" && "bg-amber-500 text-white",
        state === "upcoming" && "border-2 border-dashed border-muted-foreground/40 bg-popover",
        state === "good" && "bg-green-600 text-white",
        state === "bad" && "bg-red-600 text-white"
      )}
    >
      {state === "current" && (
        <span aria-hidden className="absolute inset-0 rounded-full bg-amber-500/50 motion-safe:animate-ping" />
      )}
      {state === "done" || state === "good" ? (
        <CheckIcon className="size-4" strokeWidth={3} />
      ) : state === "bad" ? (
        <XIcon className="size-4" strokeWidth={3} />
      ) : state === "current" ? (
        <HourglassIcon className="relative size-4" />
      ) : null}
    </span>
  );
}
