"use client";

import { useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  BusIcon,
  CalendarHeartIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  FileCheckIcon,
  FileUpIcon,
  Loader2Icon,
  ShirtIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatIdentifier } from "@/lib/format";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Child, Lead, Requirement } from "@/schemas/auth.schema";
import { useConfirmRequirement, useUploadDocument } from "@/services/admission.service";
import { ProgressRing } from "./application-step";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";

const CATEGORY: Record<Requirement["category"], string> = {
  information: "Information",
  documentation: "Documents",
  operational: "Operational",
  orientation: "Orientation",
  final: "Final",
};

const OWNER: Record<Requirement["owner"], string> = { parent: "You", school: "School", operations: "Operations" };

// Checkpoints counted back from the first day, as in the reference
const CHECKPOINTS = [
  { days: 90, label: "90 days", what: "Preparation" },
  { days: 60, label: "60 days", what: "Review outstanding items" },
  { days: 30, label: "30 days", what: "Orientation and class allotment" },
  { days: 14, label: "7 to 14 days", what: "Final instructions" },
];

/** Step 9: the before-joining checklist; done when every item that needs the family is */
export function JoiningStep({ admission, state, goNext }: StepContentProps) {
  const child = admission.child!;
  const [today] = useState(() => new Date());
  const items = child.requirements;
  const done = items.filter((r) => r.status === "done").length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;
  const mine = items.filter((r) => r.owner === "parent" && r.status !== "done");
  // Uploads have their own Documents section; this list is what to confirm
  const toConfirm = mine.filter((r) => r.action !== "upload");
  const pendingUploads = mine.filter((r) => r.action === "upload");
  // Finished uploads show under Documents instead
  const others = items.filter((r) => r.owner !== "parent" || (r.status === "done" && r.action !== "upload"));
  const daysToGo = child.joining_date ? differenceInCalendarDays(parseISO(child.joining_date), today) : null;
  const following = JOURNEY_STEPS[9];

  return (
    <>
      <StepBody>
        <section className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
          <ProgressRing value={percent} />
          <div className="min-w-0">
            <p className="font-semibold">
              {child.joining_date
                ? `Joining ${format(parseISO(child.joining_date), "EEEE d MMMM yyyy")}`
                : "Joining date to be confirmed by admissions"}
            </p>
            <p className="text-sm text-muted-foreground">
              {daysToGo !== null && daysToGo >= 0 && `${daysToGo} days to go · `}
              Readiness only. Nothing here changes {child.first_name}&apos;s admission.
            </p>
          </div>
        </section>

        <StepSection title="Action required">
          {toConfirm.length ? (
            <ul className="divide-y rounded-xl border">
              {toConfirm.map((r) => (
                <ActionRow key={r.id} requirement={r} child={child} lead={admission.lead} today={today} />
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
              <CircleCheckIcon className="size-5 shrink-0" />
              {pendingUploads.length ? "Nothing to confirm. Just the documents below." : "Nothing is needed from you right now. We'll tell you when something is."}
            </p>
          )}
        </StepSection>

        <Documents child={child} pending={pendingUploads} today={today} />

        {others.length > 0 && (
          <StepSection title="No action required currently">
            <ul className="divide-y rounded-xl bg-muted/40">
              {others.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <StatusIcon requirement={r} today={today} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", r.status === "done" && "text-muted-foreground")}>{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY[r.category]} · {statusText(r, today)}
                      {r.owner !== "parent" && ` · ${OWNER[r.owner]}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </StepSection>
        )}

        {daysToGo !== null && (
          <StepSection title="Your joining timeline">
            <ol className="grid grid-cols-4 gap-2">
              {CHECKPOINTS.map((c, i) => {
                const next = CHECKPOINTS[i + 1]?.days ?? 0;
                const now = daysToGo <= c.days && daysToGo > next;
                const passed = daysToGo <= next;
                return (
                  <li
                    key={c.label}
                    aria-current={now ? "step" : undefined}
                    className={cn(
                      "rounded-xl border p-2.5 text-xs",
                      now && "border-primary bg-primary/5 ring-1 ring-primary",
                      passed && "opacity-50"
                    )}
                  >
                    <p className="font-semibold">{c.label}</p>
                    <p className="mt-0.5 text-muted-foreground">{c.what}</p>
                  </li>
                );
              })}
            </ol>
          </StepSection>
        )}

        <StepSection title="Good to know">
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <CalendarHeartIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">Orientation</span>
                <span className="block text-muted-foreground">An invitation with the date and what to expect comes from the school.</span>
              </span>
            </li>
            {admission.lead.wants_transport && (
              <li className="flex gap-3">
                <BusIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="font-medium">Transport</span>
                  <span className="block text-muted-foreground">Operations confirms the route and pick-up point before day one.</span>
                </span>
              </li>
            )}
            <li className="flex gap-3">
              <ShirtIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">Uniform and books</span>
                <span className="block text-muted-foreground">Order through the Atlas Store once your account is live.</span>
              </span>
            </li>
          </ul>
        </StepSection>
      </StepBody>

      <StepFooter>
        {state === "done" && following ? (
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {following.title}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {mine.length
              ? `${mine.length} thing${mine.length === 1 ? "" : "s"} left for you. Questions? ${site.helpEmail}`
              : child.joining_date
                ? "All done on your side."
                : "All done on your side. Your Atlas account is set up once admissions confirms the joining date."}
          </p>
        )}
      </StepFooter>
    </>
  );
}

function overdue(r: Requirement, today: Date) {
  return r.status !== "done" && !!r.due_date && parseISO(r.due_date) < today;
}

function statusText(r: Requirement, today: Date) {
  if (r.status === "done") return r.done_at ? `Done ${format(parseISO(r.done_at), "d MMM")}` : "Done";
  if (r.status === "scheduled") return r.due_date ? `Scheduled ${format(parseISO(r.due_date), "d MMM")}` : "Scheduled";
  if (r.status === "in_progress") return "In progress";
  if (!r.due_date) return "No due date yet";
  return `${overdue(r, today) ? "Was due" : "Due"} ${format(parseISO(r.due_date), "d MMM")}`;
}

function StatusIcon({ requirement: r, today }: { requirement: Requirement; today: Date }) {
  const Icon = r.status === "done" ? CircleCheckIcon : overdue(r, today) ? CircleAlertIcon : ClockIcon;
  return (
    <Icon
      className={cn(
        "mt-0.5 size-4 shrink-0",
        r.status === "done" ? "text-green-600" : overdue(r, today) ? "text-destructive" : "text-muted-foreground"
      )}
    />
  );
}

/** An item the family confirms (the contacts one shows what's on file first) */
function ActionRow({ requirement: r, child, lead, today }: { requirement: Requirement; child: Child; lead: Lead; today: Date }) {
  const confirm = useConfirmRequirement(child.id);
  const [open, setOpen] = useState(false);
  // The contacts item shows what's on file before confirming
  const showsContacts = r.category === "information";

  const onConfirm = () =>
    confirm.mutate(r.id, { onSuccess: () => toast.success(`${r.title}: done`), onError: (e) => toast.error(e.message) });

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <StatusIcon requirement={r} today={today} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{r.title}</p>
          <p className={cn("text-xs", overdue(r, today) ? "text-destructive" : "text-muted-foreground")}>
            {CATEGORY[r.category]} · {statusText(r, today)}
          </p>
          {r.detail && <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>}
        </div>

        {showsContacts && !open ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Review
          </Button>
        ) : (
          <Button size="sm" onClick={onConfirm} disabled={confirm.isPending}>
            {confirm.isPending && <Loader2Icon className="animate-spin" />}
            Confirm
          </Button>
        )}
      </div>

      {showsContacts && open && (
        <div className="mt-3 ml-7 space-y-2">
          {[...lead.guardians.map((g) => ({ name: g.name, rel: g.relationship, mobile: g.mobile })), ...lead.emergency_contacts.map((c) => ({ name: c.name, rel: c.relationship, mobile: c.mobile }))].map(
            (person, i) => (
              <div key={i} className="flex justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{person.name}</span>
                  <span className="text-muted-foreground capitalize"> · {person.rel}</span>
                </span>
                <span className="text-muted-foreground tabular-nums">{formatIdentifier(person.mobile)}</span>
              </div>
            )
          )}
          <p className="text-xs text-muted-foreground">These people may be called, and may collect {child.first_name}. Need a change? Message your counsellor.</p>
        </div>
      )}
    </li>
  );
}

// Names for every document kind on the application (step 1 and before joining)
const DOCUMENT_LABEL: Record<string, string> = {
  child_photo: "Photograph of the child",
  birth_certificate: "Birth certificate",
  dob_proof: "Date of birth proof",
  parent_photos: "Parent photographs",
  address_proof: "Address proof",
  report_card: "Previous report card",
  transfer_certificate: "Transfer certificate",
  medical_record: "Medical form and immunisation record",
};

/** Every document on the application: what admissions sent back, what's missing, what's in */
function Documents({ child, pending, today }: { child: Child; pending: Requirement[]; today: Date }) {
  const byKind = new Map(child.documents.map((d) => [d.kind, d]));
  const sentBack = child.documents.filter((d) => d.status === "reupload_requested");
  const uploaded = child.documents.filter((d) => d.status !== "reupload_requested");
  const requiredKinds = new Set(pending.map((r) => r.document_kind));
  // Everything else not on file yet, e.g. a previous report card
  const optional = Object.keys(DOCUMENT_LABEL).filter((kind) => !byKind.has(kind) && !requiredKinds.has(kind));
  const missing = pending.length + optional.length;

  return (
    <StepSection title={`Documents · ${uploaded.length} uploaded${missing ? `, ${missing} not uploaded` : ""}`}>
      <div className="space-y-4">
        {sentBack.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-destructive">Admissions asked for a new copy</p>
            <ul className="divide-y rounded-xl border border-destructive/30 bg-destructive/5">
              {sentBack.map((d) => (
                <UploadRow
                  key={d.kind}
                  childId={child.id}
                  kind={d.kind}
                  title={DOCUMENT_LABEL[d.kind] ?? d.kind}
                  detail={d.reupload_note}
                  tone="danger"
                  cta="Re-upload"
                />
              ))}
            </ul>
          </div>
        )}

        {missing > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-amber-800">Not uploaded</p>
            <ul className="divide-y rounded-xl border border-amber-200 bg-amber-50/40">
              {pending.map((r) => (
                <UploadRow
                  key={r.id}
                  childId={child.id}
                  kind={r.document_kind}
                  title={r.title}
                  detail={`Required · ${statusText(r, today)}`}
                  tone={overdue(r, today) ? "danger" : "required"}
                  cta="Upload"
                />
              ))}
              {optional.map((kind) => (
                <UploadRow key={kind} childId={child.id} kind={kind} title={DOCUMENT_LABEL[kind]} detail="Optional" tone="optional" cta="Upload" />
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Uploaded</p>
          {uploaded.length ? (
            <ul className="divide-y rounded-xl border">
              {uploaded.map((d) => (
                <li key={d.kind} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <FileCheckIcon className="size-4 shrink-0 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{DOCUMENT_LABEL[d.kind] ?? d.kind}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.original_name} · {format(parseISO(d.updated_at), "d MMM yyyy")}
                    </p>
                  </div>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-primary hover:underline">
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No documents yet.</p>
          )}
        </div>
      </div>
    </StepSection>
  );
}

const TONE = {
  danger: { icon: "text-destructive", detail: "text-destructive" },
  required: { icon: "text-amber-700", detail: "text-muted-foreground" },
  optional: { icon: "text-muted-foreground", detail: "text-muted-foreground" },
};

/** One document to upload, with the size and type rules */
function UploadRow({
  childId,
  kind,
  title,
  detail,
  tone,
  cta,
}: {
  childId: number;
  kind: string;
  title: string;
  detail: string;
  tone: keyof typeof TONE;
  cta: string;
}) {
  const upload = useUploadDocument(childId);

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("The file is larger than 10 MB.");
    upload.mutate({ kind, file }, { onSuccess: () => toast.success(`${title} uploaded`), onError: (e) => toast.error(e.message) });
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <FileUpIcon className={cn("size-4 shrink-0", TONE[tone].icon)} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className={cn("text-xs", TONE[tone].detail)}>{detail}</p>
        <p className="text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB</p>
      </div>
      <label
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          tone === "optional" ? "border hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90",
          upload.isPending && "pointer-events-none opacity-60"
        )}
      >
        {upload.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
        {cta}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
    </li>
  );
}
