import Link from "next/link";
import { CheckIcon, LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  canOpenStep,
  getStepState,
  JOURNEY_PARTS,
  JOURNEY_STEPS,
  TOTAL_STEPS,
  type JourneyStep,
  type StepState,
} from "@/lib/journey";
import type { Admission } from "@/types/admission.types";

// Geometry (px, except x which is % of the map width)
const NODE = 72; // tile size
const ROW = 176; // vertical distance between steps in a part
const GAP = 72; // extra space between parts for the part sign
const TOP = 76; // room for the first part sign
const partOf = (i: number) =>
  JOURNEY_PARTS.findIndex((part) => (part.steps as readonly number[]).includes(i + 1));
const xOf = (i: number) => (i % 2 === 0 ? 30 : 70);
const yOf = (i: number) => TOP + i * ROW + partOf(i) * GAP + NODE / 2;
const HEIGHT = yOf(TOTAL_STEPS - 1) + NODE / 2 + 72;

const pad = (n: number) => String(n).padStart(2, "0");

/** Journey card: dotted mesh background with a winding route through the steps */
export function JourneyMap({ admission }: { admission: Admission }) {
  const steps = JOURNEY_STEPS.map((step, i) => ({ step, i, state: getStepState(step.number, admission) }));
  const done = steps.filter((s) => s.state === "done").length;

  return (
    <section
      aria-labelledby="journey-heading"
      className="relative isolate overflow-hidden rounded-[2rem] bg-[color-mix(in_oklab,var(--primary)_4%,white)] ring-1 ring-navy/10"
    >
      <MeshBackground />

      <header className="relative flex items-end justify-between gap-4 px-6 pt-7 sm:px-8">
        <div>
          <h2 id="journey-heading" className="font-serif text-4xl leading-none text-navy italic">
            Your journey
          </h2>
          <p className="mt-2 text-sm text-navy/70">From application to your Atlas account</p>
        </div>
        <p className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-navy shadow-sm ring-1 ring-navy/10 backdrop-blur tabular-nums">
          {done} of {TOTAL_STEPS} done
        </p>
      </header>

      <div className="relative mx-auto max-w-2xl" style={{ height: HEIGHT }}>
        <Route steps={steps} />
        <PartSigns />

        <ol>
          {steps.map(({ step, i, state }) => (
            <StepStop key={step.number} step={step} i={i} state={state} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function MeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* colour blooms */}
      <div className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-1/3 -left-32 size-96 rounded-full bg-navy/10 blur-3xl" />
      <div className="absolute -bottom-24 right-0 size-72 rounded-full bg-primary/10 blur-3xl" />
      {/* dot grid, faded toward the edges */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--navy) 22%, transparent) 1.2px, transparent 0)",
          backgroundSize: "20px 20px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 55%, transparent 100%)",
        }}
      />
    </div>
  );
}

type Stop = { step: JourneyStep; i: number; state: StepState };

/** The track: glowing where travelled, dashed ahead */
function Route({ steps }: { steps: Stop[] }) {
  const segments = steps.slice(0, -1).map(({ i }) => {
    const [x1, y1, x2, y2] = [xOf(i), yOf(i), xOf(i + 1), yOf(i + 1)];
    const bend = (y2 - y1) * 0.55;
    return {
      i,
      d: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
      reached: steps[i + 1].state === "done" || steps[i + 1].state === "current",
    };
  });
  // Stub from the first part sign down to step 1
  const lead = `M ${xOf(0)} ${TOP / 2} L ${xOf(0)} ${yOf(0)}`;
  const line = { fill: "none", strokeLinecap: "round" as const, vectorEffect: "non-scaling-stroke" as const };

  return (
    <svg
      aria-hidden
      className="absolute inset-0 size-full overflow-visible"
      viewBox={`0 0 100 ${HEIGHT}`}
      preserveAspectRatio="none"
    >
      <path d={lead} {...line} strokeWidth={12} className="stroke-primary" />
      {segments.map((s) =>
        s.reached ? (
          <g key={s.i}>
            <path d={s.d} {...line} strokeWidth={26} className="stroke-primary/15" />
            <path d={s.d} {...line} strokeWidth={12} className="stroke-primary" />
          </g>
        ) : (
          <path key={s.i} d={s.d} {...line} strokeWidth={6} strokeDasharray="2 14" className="stroke-navy/25" />
        )
      )}
    </svg>
  );
}

/** "Part A · Visit" signs sitting on the track where each part begins */
function PartSigns() {
  return JOURNEY_PARTS.map((part, p) => {
    const first = part.steps[0] - 1;
    // Part A sits above step 1; later parts sit on the curve's midpoint between parts
    const x = p === 0 ? xOf(0) : 50;
    const y = p === 0 ? TOP / 2 : (yOf(first - 1) + yOf(first)) / 2;
    return (
      <p
        key={part.label}
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-navy py-1.5 pr-4 pl-1.5 text-sm whitespace-nowrap text-white shadow-lg shadow-navy/25"
        style={{ left: `${x}%`, top: y }}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-white font-serif text-base text-navy italic">
          {String.fromCharCode(65 + p)}
        </span>
        <span className="font-medium">{part.label}</span>
        <span className="text-white/60 tabular-nums">
          Steps {part.steps[0]}–{part.steps[part.steps.length - 1]}
        </span>
      </p>
    );
  });
}

function StepStop({ step, i, state }: Stop) {
  const Icon = step.icon;
  const x = xOf(i);
  const y = yOf(i);
  const openable = canOpenStep(state);

  const tile = (
    <span
      className={cn(
        "relative flex size-full items-center justify-center rounded-[1.4rem] transition-transform duration-200",
        openable && "group-hover:-translate-y-0.5",
        state === "done" && "bg-primary text-primary-foreground shadow-xl shadow-primary/35",
        state === "current" && "bg-white text-primary shadow-xl shadow-primary/25 ring-[3px] ring-primary",
        state === "upcoming" && "border-2 border-dashed border-navy/20 bg-white/70 text-navy/35 backdrop-blur",
        state === "closed" && "bg-muted text-muted-foreground"
      )}
    >
      {/* The page's one ambient motion: the current stop breathes */}
      {state === "current" && (
        <span aria-hidden className="absolute -inset-1.5 rounded-[1.7rem] ring-2 ring-primary/40 motion-safe:animate-pulse" />
      )}
      {state === "done" ? (
        <CheckIcon className="size-8" strokeWidth={2.75} />
      ) : state === "closed" ? (
        <LockIcon className="size-6" />
      ) : (
        <Icon className="size-7" strokeWidth={1.75} />
      )}
      <span
        className={cn(
          "absolute -top-2.5 -left-2.5 rounded-md px-1.5 py-0.5 text-xs font-semibold slashed-zero tabular-nums ring-1",
          state === "done" || state === "current"
            ? "bg-white text-primary ring-primary/40"
            : "bg-white/80 text-navy/40 ring-navy/15"
        )}
      >
        {pad(step.number)}
      </span>
    </span>
  );

  const content = (
    <>
      <span className="absolute" style={{ left: `calc(${x}% - ${NODE / 2}px)`, top: y - NODE / 2, width: NODE, height: NODE }}>
        {tile}
      </span>

      <span
        className={cn(
          "absolute max-w-[11rem] -translate-x-1/2 rounded-full px-3.5 py-1.5 text-center text-sm leading-tight font-medium shadow-sm ring-1",
          state === "upcoming" || state === "closed"
            ? "bg-white/70 text-navy/50 ring-navy/10 backdrop-blur"
            : "bg-white text-navy ring-navy/10",
          openable && "group-hover:ring-primary/40"
        )}
        style={{ left: `${x}%`, top: y + NODE / 2 + 12 }}
      >
        {step.title}
      </span>

      {state === "current" && <HereCallout step={step} i={i} />}
      <span className="sr-only">{STATE_LABEL[state]}</span>
    </>
  );

  return (
    <li aria-current={state === "current" ? "step" : undefined}>
      {openable ? (
        <Link
          href={{ query: { step: step.number } }}
          replace
          scroll={false}
          aria-label={`Step ${step.number}: ${step.title}, ${STATE_LABEL[state].toLowerCase()}`}
          className="group outline-none [&:focus-visible>span:first-child>span]:ring-4 [&:focus-visible>span:first-child>span]:ring-ring/50"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

/** Callout beside the current tile, on the side away from it */
function HereCallout({ step, i }: { step: JourneyStep; i: number }) {
  const onLeft = xOf(i) < 50;
  const gap = `calc(${onLeft ? xOf(i) : 100 - xOf(i)}% + ${NODE / 2 + 18}px)`;

  return (
    <span
      className="absolute flex max-w-[15rem] -translate-y-1/2 flex-col rounded-2xl bg-navy px-4 py-3 text-white shadow-xl shadow-navy/25"
      style={{ top: yOf(i), width: `calc(100% - ${gap} - 12px)`, ...(onLeft ? { left: gap } : { right: gap }) }}
    >
      <span className="text-xs text-white/60">You are here</span>
      <span className="mt-0.5 text-sm leading-snug font-semibold">{step.action.title}</span>
      <span className="mt-1.5 text-xs font-medium text-primary-foreground/90 underline underline-offset-4">
        Open step
      </span>
    </span>
  );
}

const STATE_LABEL: Record<StepState, string> = {
  done: "Completed",
  current: "Current step",
  upcoming: "Not started",
  closed: "Closed",
};
