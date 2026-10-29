"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CircleAlertIcon, CircleCheckIcon, EarIcon, KeyRoundIcon, Loader2Icon, ScanLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { site } from "@/lib/site";
import { useGateCheck, type GateVisit } from "@/services/admission.service";
import type { AxiosError } from "axios";

// Kept for the shift in this tab only; never in localStorage
const KEY_STORE = "gate-key";

function readKey() {
  try {
    return sessionStorage.getItem(KEY_STORE) ?? "";
  } catch {
    return "";
  }
}

const statusOf = (error: Error | null) => (error?.cause as AxiosError | undefined)?.response?.status;

/** Gate staff enter a visitor's pass code, check who it is, and approve the visit */
export function VisitorApprove() {
  // The key used for the last lookup; approve reuses it
  const [gateKey, setGateKey] = useState("");
  const [code, setCode] = useState("");
  const lookup = useGateCheck("lookup");
  const approve = useGateCheck("approve");

  const visit = approve.data ?? lookup.data;
  const error = approve.error ?? lookup.error;
  const keyRejected = statusOf(error) === 403;
  const busy = lookup.isPending || approve.isPending;

  const find = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const key = String(new FormData(e.currentTarget).get("gate_key") ?? "");
    try {
      sessionStorage.setItem(KEY_STORE, key);
    } catch {}
    setGateKey(key);
    approve.reset();
    lookup.mutate({ code: code.trim(), gateKey: key });
  };

  const next = () => {
    lookup.reset();
    approve.reset();
    setCode("");
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="font-serif text-2xl text-navy italic">{site.school}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Visitor check-in</h1>
        <p className="text-sm text-muted-foreground">Enter the gate pass code from the visitor&apos;s ticket.</p>
      </header>

      <form onSubmit={find} className="space-y-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/5">
        <Field data-invalid={keyRejected}>
          <FieldLabel htmlFor="gate-key">
            <KeyRoundIcon className="size-4" />
            Gate key
          </FieldLabel>
          <Input
            id="gate-key"
            name="gate_key"
            type="password"
            autoComplete="off"
            className="h-11"
            aria-invalid={keyRejected}
            // Filled from this tab's session after hydration, so server and client markup match
            ref={(el) => {
              if (el && !el.value) el.value = readKey();
            }}
          />
          <FieldError>{keyRejected && "That gate key isn't right. Ask the admissions office."}</FieldError>
        </Field>

        <Field data-invalid={statusOf(error) === 404}>
          <FieldLabel htmlFor="pass-code">
            <ScanLineIcon className="size-4" />
            Gate pass code
          </FieldLabel>
          <Input
            id="pass-code"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            placeholder="ABC123"
            className="h-16 text-center font-mono text-3xl tracking-[0.4em] uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
          <FieldError>{statusOf(error) === 404 && "No booked visit has this code. Check it with the visitor."}</FieldError>
        </Field>

        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base font-semibold" disabled={code.length !== 6 || busy}>
          {lookup.isPending && <Loader2Icon className="animate-spin" />}
          Find visit
        </Button>

        {error && ![403, 404].includes(statusOf(error) ?? 0) && !visit && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}
      </form>

      {visit && (
        <VisitCard
          visit={visit}
          approving={approve.isPending}
          approved={approve.isSuccess}
          problem={approve.error?.message}
          onApprove={() => approve.mutate({ code: visit.code, gateKey })}
          onNext={next}
        />
      )}
    </div>
  );
}

function VisitCard({
  visit,
  approving,
  approved,
  problem,
  onApprove,
  onNext,
}: {
  visit: GateVisit;
  approving: boolean;
  approved: boolean;
  problem?: string;
  onApprove: () => void;
  onNext: () => void;
}) {
  const attended = visit.status === "attended";
  const rows = [
    ["Family", visit.family],
    ["Child", `${visit.child} · ${visit.grade}`],
    ["Visit", `${format(parseISO(visit.date), "EEE d MMM")} at ${visit.start_time} · ${visit.gate}`],
    ["Type", visit.visit_type],
    ["Meeting", visit.staff.join(", ") || "Admission counsellor"],
    ["Reference", visit.reference],
  ];

  return (
    <section aria-live="polite" className="space-y-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/5">
      {attended ? (
        <p className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm font-semibold text-primary">
          <CircleCheckIcon className="size-5" />
          {approved ? "Checked in. Their journey moves on to review." : `Already checked in${visit.attended_at ? ` at ${format(parseISO(visit.attended_at), "h:mm a")}` : ""}.`}
        </p>
      ) : !visit.is_today ? (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <CircleAlertIcon className="size-5" />
          This pass is for {format(parseISO(visit.date), "EEEE d MMMM")}, not today.
        </p>
      ) : null}

      <dl className="divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {visit.hearing_aid && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <EarIcon className="size-4" />
          Someone in this family uses a hearing aid.
        </p>
      )}

      {problem && !attended && (
        <p className="text-sm text-destructive" role="alert">
          {problem}
        </p>
      )}

      {attended ? (
        <Button size="lg" variant="outline" className="h-12 w-full rounded-xl" onClick={onNext}>
          Next visitor
        </Button>
      ) : (
        <Button size="lg" className="h-12 w-full rounded-xl text-base font-semibold" disabled={!visit.is_today || approving} onClick={onApprove}>
          {approving && <Loader2Icon className="animate-spin" />}
          Approve visit
        </Button>
      )}
    </section>
  );
}
