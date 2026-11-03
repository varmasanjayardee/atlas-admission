import Link from "next/link";
import { format, parseISO } from "date-fns";
import { FileWarningIcon } from "lucide-react";
import { getCurrentStep, isEnded } from "@/lib/journey";
import type { Admission } from "@/types/admission.types";

/** The one thing the parent should do now */
export function NextAction({ admission }: { admission: Admission }) {
  if (isEnded(admission)) return null;

  const step = getCurrentStep(admission);
  const Icon = step.icon;
  const { visit } = admission;
  const detail =
    step.number === 4 && visit
      ? `Come to ${visit.gate} at ${visit.time} on ${format(parseISO(visit.date), "d MMM")}. Keep your phone ready for the gate pass.`
      : step.description;

  return (
    <section className="flex items-center gap-4 rounded-2xl bg-primary p-4 text-primary-foreground">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground text-primary">
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">{step.action.title}</h3>
        <p className="mt-0.5 text-sm text-primary-foreground/85">{detail}</p>
      </div>
      <Link
        href={{ query: { step: step.number } }}
        replace
        scroll={false}
        className="shrink-0 rounded-full bg-primary-foreground px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
      >
        {step.action.cta}
      </Link>
    </section>
  );
}

/** Admissions sent documents back; shown on top of everything else until they're replaced */
export function ReuploadBanner({ admission }: { admission: Admission }) {
  const sentBack = admission.child?.documents.filter((d) => d.status === "reupload_requested") ?? [];
  if (!sentBack.length) return null;

  // Step 9 lists every document; before that, the application form holds them
  const step = admission.currentStep >= 9 ? 9 : 1;

  return (
    <section role="alert" className="flex items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
        <FileWarningIcon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">
          Admissions needs a new copy of {sentBack.length === 1 ? "a document" : `${sentBack.length} documents`}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{sentBack[0].reupload_note}</p>
      </div>
      <Link
        href={{ query: { step } }}
        replace
        scroll={false}
        className="shrink-0 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:ring-3 focus-visible:ring-destructive/40 focus-visible:outline-none"
      >
        Re-upload
      </Link>
    </section>
  );
}
