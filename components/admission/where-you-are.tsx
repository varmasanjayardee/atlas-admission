import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { endedTitle, getCurrentStep, getStepState, JOURNEY_PARTS, TOTAL_STEPS } from "@/lib/journey";
import type { Admission } from "@/types/admission.types";

const pad = (n: number) => String(n).padStart(2, "0");

export function WhereYouAre({ admission }: { admission: Admission }) {
  const step = getCurrentStep(admission);
  const part = JOURNEY_PARTS.find((p) => (p.steps as readonly number[]).includes(step.number))!;
  const partLetter = String.fromCharCode(65 + JOURNEY_PARTS.indexOf(part));
  const days = differenceInCalendarDays(new Date(), parseISO(admission.enquiryDate));

  return (
    <section aria-labelledby="where-you-are">
      <div className="flex items-center justify-between gap-3">
        <h2 id="where-you-are" className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Where you are
        </h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
          Part {partLetter} · {part.label}
        </span>
      </div>

      <p className="mt-2 flex items-baseline gap-1 text-primary">
        <span className="text-8xl leading-none font-bold tracking-tighter slashed-zero tabular-nums">
          {pad(step.number)}
        </span>
        <span className="text-2xl text-muted-foreground tabular-nums">/{pad(TOTAL_STEPS)}</span>
        <span className="sr-only">
          Step {step.number} of {TOTAL_STEPS}
        </span>
      </p>

      <p className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance">
        {endedTitle(admission) ?? step.action.title}
      </p>
      <p className="mt-1 text-muted-foreground">
        {step.title} · day {days} since your enquiry
      </p>

      {/* Progress, grouped into the three parts */}
      <div className="mt-6 grid grid-cols-3 gap-3" aria-hidden>
        {JOURNEY_PARTS.map((p) => (
          <div key={p.label}>
            <div className="flex gap-1">
              {p.steps.map((n) => {
                const state = getStepState(n, admission);
                return (
                  <span
                    key={n}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      state === "done" && "bg-primary",
                      state === "current" && "bg-primary/60",
                      (state === "upcoming" || state === "closed") && "bg-muted-foreground/20"
                    )}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{p.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
