"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CircleAlertIcon, CircleCheckIcon, ClockIcon, Loader2Icon, LockIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { feeNote, formatCurrency } from "@/lib/format";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Payment } from "@/schemas/auth.schema";
import { useChildFees, useRefreshPayment, useSendReceipt, useStartPayment, type ReceiptMethod } from "@/services/admission.service";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";

type Kind = Payment["kind"];

// What each journey fee is for, in the family's words
const COPY: Record<Kind, { title: string; purpose: (name: string) => string }> = {
  registration: { title: "Registration fee", purpose: () => "Unlocks visit booking" },
  admission: { title: "Admission fee", purpose: (name) => `Confirms ${name}'s place` },
};

/** Steps 2 and 7: a journey fee from the fee plan, paid online through ICICI, or by UPI or
 * bank transfer with a receipt that admissions approves before the step completes */
export function FeeStep({ admission, step, state, goNext, kind }: StepContentProps & { kind: Kind }) {
  const child = admission.child!;
  const fees = useChildFees(child.id);
  const start = useStartPayment(child.id);
  const refresh = useRefreshPayment(child.id);
  const params = useSearchParams();
  const copy = COPY[kind];

  const attempts = child.payments.filter((p) => p.kind === kind);
  const paid = attempts.find((p) => p.status === "success");
  const latest = attempts[0];
  // An online attempt still out with the bank (a receipt waiting on admissions is `checking`)
  const unsettled = !paid && latest && latest.gateway !== "receipt" && (latest.status === "pending" || latest.status === "initiated");
  const checking = paid ? undefined : attempts.find((p) => p.gateway === "receipt" && p.status === "pending");

  // Back from ICICI with ?payment=<id>: if it isn't settled yet, ask the server to check once
  const returned = Number(params.get("payment"));
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || !unsettled || latest.id !== returned) return;
    checked.current = true;
    refresh.mutate(latest.id);
  }, [unsettled, latest, returned, refresh]);

  const group = fees.data?.[kind];
  const confirming = !!unsettled && latest.id === returned;
  const failed = !paid && !confirming && latest?.status === "failed";
  const amount = paid?.amount ?? group?.total;
  const registrationPaid = child.payments.find((p) => p.kind === "registration" && p.status === "success");
  const following = JOURNEY_STEPS[step.number];

  const chip = paid
    ? { label: "Paid", tone: "bg-green-400/20 text-green-100 ring-green-300/40", icon: CircleCheckIcon }
    : checking
      ? { label: "Being checked", tone: "bg-white/15 text-white ring-white/30", icon: ClockIcon }
      : confirming
      ? { label: "Confirming", tone: "bg-white/15 text-white ring-white/30", icon: Loader2Icon }
      : failed
        ? { label: "Didn't go through", tone: "bg-red-400/20 text-red-100 ring-red-300/40", icon: CircleAlertIcon }
        : { label: "Due", tone: "bg-amber-300/20 text-amber-100 ring-amber-200/40", icon: null };
  const ChipIcon = chip.icon;

  return (
    <>
      <StepBody>
        {/* The bill */}
        <section className="relative overflow-hidden rounded-2xl bg-navy px-6 pt-5 pb-6 text-white shadow-[0_16px_36px_-14px_color-mix(in_oklab,var(--navy)_60%,transparent)]">
          <span aria-hidden className="absolute -top-16 -right-12 size-44 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between gap-3">
            <p className="text-sm text-white/70">
              {copy.title} · {child.first_name}
            </p>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", chip.tone)} role="status">
              {ChipIcon && <ChipIcon className={cn("size-3.5", confirming && "animate-spin")} />}
              {chip.label}
            </span>
          </div>
          {fees.isLoading && !paid ? (
            <div className="mt-3 h-12 w-48 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <p className="relative mt-2 text-[2.75rem] leading-none font-bold tracking-tight tabular-nums">
              {amount ? formatCurrency(amount) : "—"}
            </p>
          )}
          <p className="relative mt-2 text-sm text-white/70">
            {copy.purpose(child.first_name)}
            {fees.data && ` · ${fees.data.plan.grade}, ${fees.data.plan.academic_year}`}
          </p>
        </section>

        {paid ? (
          <StepSection title="Receipt">
            <dl className="divide-y rounded-xl border px-4 text-sm">
              {[
                ["Paid on", paid.paid_at && format(parseISO(paid.paid_at), "d MMM yyyy, h:mm a")],
                ["Paid by", paid.gateway_payment_mode],
                ["Bank reference", paid.gateway_transaction_id],
                ["Application", child.reference],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
          </StepSection>
        ) : confirming ? (
          <p className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm" aria-live="polite">
            <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
            <span>
              <span className="font-semibold">Confirming your payment with the bank.</span>{" "}
              <span className="text-muted-foreground">This usually takes a few seconds. Don&apos;t pay again.</span>{" "}
              {!refresh.isPending && (
                <button type="button" onClick={() => refresh.mutate(latest.id)} className="font-medium text-primary hover:underline">
                  Check again
                </button>
              )}
            </span>
          </p>
        ) : checking ? (
          <p className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm" aria-live="polite">
            <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-semibold">Admissions is checking your receipt.</span>{" "}
              <span className="text-muted-foreground">
                {checking.gateway_payment_mode} {checking.gateway_transaction_id}, sent {format(parseISO(checking.created_at), "d MMM, h:mm a")}. This step
                completes once they approve it. Don&apos;t pay again.
              </span>{" "}
              {checking.receipt_url && (
                <a href={checking.receipt_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  View receipt
                </a>
              )}
            </span>
          </p>
        ) : (
          failed && (
            <p className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm" role="alert">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              {latest.gateway === "receipt" ? (
                <span>
                  <span className="font-semibold">Admissions couldn&apos;t accept your receipt.</span>{" "}
                  <span className="text-muted-foreground">{latest.failure_reason} Pay online, or send the right receipt.</span>
                </span>
              ) : (
                <span>
                  <span className="font-semibold">Your last payment didn&apos;t go through.</span>{" "}
                  <span className="text-muted-foreground">{latest.failure_reason || "The bank declined it."} No money was taken.</span>
                </span>
              )}
            </p>
          )
        )}

        <StepSection title="What it covers">
          {!group?.items.length && !paid ? (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Fees for {child.grade || "this grade"} at {admission.campus || "your campus"} aren&apos;t published yet. Your counsellor will
              share them, or email {site.helpEmail}.
            </p>
          ) : (
            <dl className="divide-y rounded-xl border px-4 text-sm">
              {(group?.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <dt>
                    {item.label}
                    {feeNote(item) && <span className="block text-xs text-muted-foreground">{feeNote(item)}</span>}
                  </dt>
                  <dd className={cn("font-medium tabular-nums", item.is_optional && "text-muted-foreground")}>{formatCurrency(item.annual_amount)}</dd>
                </div>
              ))}
              {amount && (
                <div className="flex justify-between gap-4 py-3 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatCurrency(amount)}</dd>
                </div>
              )}
            </dl>
          )}
        </StepSection>

        {!paid && !checking && !confirming && !!group?.items.length && <ReceiptOption childId={child.id} kind={kind} />}

        {kind === "admission" && registrationPaid && (
          <StepSection title="Around it">
            <dl className="divide-y rounded-xl bg-muted/50 px-4 text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Registration fee, already paid</dt>
                <dd className="font-medium text-green-700 tabular-nums">{formatCurrency(registrationPaid.amount)}</dd>
              </div>
            </dl>
          </StepSection>
        )}
      </StepBody>

      <StepFooter>
        {state === "done" && following ? (
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {following.title}
          </Button>
        ) : (
          !paid && (
            <>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <LockIcon className="size-3" />
                You&apos;ll pay on ICICI Bank&apos;s secure page, then come back here
              </p>
              <Button
                size="lg"
                className="h-12 rounded-xl text-base font-semibold"
                disabled={!group?.items.length || start.isPending || start.isSuccess || refresh.isPending || confirming || !!checking}
                onClick={() => start.mutate(kind)}
              >
                {(start.isPending || start.isSuccess) && <Loader2Icon className="animate-spin" />}
                {group ? `Pay ${formatCurrency(group.total)} online` : `Pay ${copy.title.toLowerCase()} online`}
              </Button>
              {start.isError && <p className="text-center text-sm text-destructive">{start.error.message}</p>}
            </>
          )
        )}
      </StepFooter>
    </>
  );
}

const RECEIPT_METHODS: { value: ReceiptMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
];

/** The other way to pay: by UPI or bank transfer outside the portal, then the receipt for admissions to approve */
function ReceiptOption({ childId, kind }: { childId: number; kind: Kind }) {
  const send = useSendReceipt(childId);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<ReceiptMethod>("upi");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const field = "h-11 w-full rounded-lg border bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

  if (!open)
    return (
      <StepSection title="Paid by UPI or bank transfer?">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left text-sm hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <UploadIcon className="size-5 shrink-0 text-primary" />
          <span>
            <span className="block font-semibold">Upload your receipt</span>
            <span className="block text-muted-foreground">Admissions checks it, and this step completes once they approve it.</span>
          </span>
        </button>
      </StepSection>
    );

  return (
    <StepSection title="Upload your receipt">
      <form
        className="space-y-4 rounded-xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reference.trim()) return setError("Add the UPI or bank transaction reference.");
          if (!file) return setError("Choose the receipt: a screenshot, photo or PDF.");
          if (file.size > 10 * 1024 * 1024) return setError("The file is larger than 10 MB.");
          setError("");
          send.mutate({ kind, method, reference: reference.trim(), file }, { onError: (err) => setError(err.message) });
        }}
      >
        <div role="radiogroup" aria-label="How you paid" className="grid grid-cols-2 gap-2">
          {RECEIPT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={method === m.value}
              onClick={() => setMethod(m.value)}
              className="h-11 rounded-lg border text-sm font-medium transition-colors aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:text-primary"
            >
              {m.label}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="font-medium">{method === "upi" ? "UPI transaction ID" : "Bank reference (UTR)"}</span>
          <input className={cn(field, "mt-1.5")} value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Receipt</span>
          <span className="block text-xs text-muted-foreground">A screenshot, photo or PDF, up to 10 MB</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-semibold file:text-primary" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={send.isPending}>
            {send.isPending && <Loader2Icon className="animate-spin" />}
            Send receipt
          </Button>
        </div>
      </form>
    </StepSection>
  );
}
