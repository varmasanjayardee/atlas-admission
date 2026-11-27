"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarXIcon, ChevronRightIcon, CircleAlertIcon, CircleCheckIcon, ClockIcon, CopyIcon, DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { feeNote, formatCurrency } from "@/lib/format";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ChildFees, Payment } from "@/schemas/auth.schema";
import { useChildFees, useChildSlots, useRefreshPayment, useSendReceipt, useStartPayment, type ReceiptMethod } from "@/services/admission.service";
import { StepBody, type StepContentProps } from "./step-layout";

type Kind = Payment["kind"];

// Step 2: when a family hears back after sending a receipt
const FINANCE_NOTE = "Our finance team will get back to you within 48 hours.";

// What each journey fee is for, in the family's words
const COPY: Record<Kind, { title: string; total: string; purpose: string; confirmed: string }> = {
  registration: {
    title: "Application fee",
    total: "Total application fee",
    purpose: "Unlocks your campus visit booking once verified.",
    confirmed: "Your campus visit booking is unlocked.",
  },
  admission: {
    title: "Admission fee",
    total: "Total admission payment",
    purpose: "Confirms your child's place once verified.",
    confirmed: "Your child's place has been confirmed.",
  },
};

/** Steps 2 and 8: a journey fee from the fee plan, paid online through ICICI, or by UPI or
 * bank transfer with a receipt that admissions approves before the step completes.
 * Four screens, as in the design: what's due, making the payment, receipt submitted, payment confirmed. */
// ponytail: online (ICICI) payment is switched off for families for now; flip to false to offer it again
const ONLINE_LOCKED = true;

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
  const amount = paid?.amount ?? checking?.amount ?? group?.total;
  const registrationPaid = child.payments.find((p) => p.kind === "registration" && p.status === "success");
  const following = JOURNEY_STEPS[step.number];
  const due = !paid && !checking && !confirming && !!group?.items.length;
  // The application fee only unlocks visit booking: with every slot full (or none), don't take it yet.
  // If the slots can't be loaded, payment stays open rather than blocking the family.
  const slots = useChildSlots(child.id, kind === "registration" && due);
  const noSlots = kind === "registration" && !!slots.data && !slots.data.some((slot) => slot.places_left > 0);
  const choosing = due && (kind !== "registration" || !!slots.data || slots.isError) && !noSlots;
  // "Continue to payment" moves from what's due to paying it; a failed receipt goes straight back to paying
  const [paying, setPaying] = useState(false);
  const meta = [`${child.first_name} ${child.last_name}`.trim(), child.grade, shortCampus(admission.campus), child.academic_year_name].filter(Boolean).join(" · ");
  const total = amount ? formatCurrency(amount) : "—";

  const label = kind === "admission" ? "Admission payment" : "Application fee";
  const feeLines = (
    <dl className="divide-y border-b">
      {(group?.items ?? []).map((item) => (
        <div key={item.id} className="flex justify-between gap-4 py-4">
          <dt>
            {item.label}
            {feeNote(item) && <span className="block text-sm text-muted-foreground">{feeNote(item)}</span>}
          </dt>
          <dd className={cn("font-bold whitespace-nowrap tabular-nums", item.is_optional && "font-normal text-muted-foreground")}>{formatCurrency(item.annual_amount)}</dd>
        </div>
      ))}
      {kind === "admission" && registrationPaid && (
        <div className="flex justify-between gap-4 py-4">
          <dt>
            Application fee
            <span className="block text-sm text-muted-foreground">Already paid; excluded from the amount above.</span>
          </dt>
          <dd className="font-bold whitespace-nowrap text-green-700 tabular-nums">Paid · {formatCurrency(registrationPaid.amount)}</dd>
        </div>
      )}
    </dl>
  );

  // Payment confirmed
  if (paid)
    return (
      <StepBody className="@container max-sm:px-4">
        <Split
          main={
            <>
              <Outcome icon={CircleCheckIcon} tone="good" title="Payment confirmed." lead={copy.confirmed} />
              <AmountCard label={label} amount={total} status="Received" tone="good" note={meta} />
            </>
          }
          side={
            <>
              <dl className="divide-y border-y">
                {[
                  ["Paid on", paid.paid_at && format(parseISO(paid.paid_at), "d MMM yyyy, h:mm a")],
                  ["Paid by", paid.gateway_payment_mode],
                  ["Reference", paid.gateway_transaction_id],
                  ["Application", child.reference],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-bold tabular-nums">{value}</dd>
                    </div>
                  ))}
              </dl>
              {paid.receipt_url && <LinkCard href={paid.receipt_url} title="Your payment receipt" detail="View the proof of payment you sent" />}
              {following && (
                <div>
                  <h3 className="text-xl font-bold text-navy-ink">Next: {following.title.toLowerCase()}</h3>
                  <p className="mt-1 text-muted-foreground">{following.description}.</p>
                </div>
              )}
              {state === "done" && following && (
                <Button size="lg" className="h-12 w-full rounded-xl text-base font-bold" onClick={goNext}>
                  Continue to {following.title.toLowerCase()}
                </Button>
              )}
            </>
          }
        />
      </StepBody>
    );

  // Receipt sent, admissions checking it (or an online payment being confirmed with the bank)
  if (checking || confirming)
    return (
      <StepBody className="@container max-sm:px-4">
        <Split
          main={
            <>
              <Outcome
                icon={checking ? ClockIcon : Loader2Icon}
                spin={confirming}
                title={checking ? "Receipt submitted." : "Confirming your payment."}
                lead={checking ? "Your payment is awaiting verification." : "This usually takes a few seconds. Don't pay again."}
              />
              <AmountCard label={label} amount={total} status={checking ? "Under review" : "Confirming"} note={meta} />
            </>
          }
          side={
            <>
              {checking ? (
                <>
                  <div>
                    <h3 className="text-xl font-bold text-navy-ink">What happens next?</h3>
                    <p className="mt-2 text-muted-foreground">
                      The admissions team will verify your receipt. We will notify you once payment is confirmed or if further information is needed.
                      {kind === "registration" && ` ${FINANCE_NOTE}`} Don&apos;t pay again.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[checking.gateway_payment_mode, checking.gateway_transaction_id].filter(Boolean).join(" ")}
                      {` · sent ${format(parseISO(checking.created_at), "d MMM, h:mm a")}`}
                    </p>
                  </div>
                  {checking.receipt_url && <LinkCard href={checking.receipt_url} title="Submitted receipt" detail="View your uploaded proof of payment" />}
                </>
              ) : (
                !refresh.isPending && (
                  <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => refresh.mutate(latest.id)}>
                    Check again
                  </Button>
                )
              )}
              <Link href="/" className={PRIMARY}>
                Return to your journey
              </Link>
            </>
          }
        />
      </StepBody>
    );

  // Making the payment: the form on the left, what's being paid pinned on the right
  if (choosing && (paying || failed))
    return (
      <StepBody className="@container max-sm:px-4">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-navy-ink sm:text-4xl">Make your payment.</h2>
            <p className="mt-1 text-muted-foreground @3xl:hidden">Amount payable: {total}</p>
            <p className="mt-1 hidden text-muted-foreground @3xl:block">{meta}</p>
          </div>
          <div className="grid items-start gap-8 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @3xl:gap-10">
            <div className="space-y-6">
              {failed && <Failed payment={latest} />}
              <Segmented
                label="How you'll pay"
                value="manual"
                options={[
                  { value: "manual", label: "Manual payment" },
                  { value: "online", label: ONLINE_LOCKED ? "Online · unavailable" : "Online payment", disabled: ONLINE_LOCKED },
                ]}
                onChange={() => {}}
              />
              <ManualPayment childId={child.id} kind={kind} bank={fees.data?.bank ?? null} />
            </div>
            <aside className="hidden space-y-4 @3xl:sticky @3xl:top-20 @3xl:block">
              <div className="rounded-2xl border bg-card p-6">
                <p className="text-xs tracking-wider text-muted-foreground uppercase">Amount payable</p>
                <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">{total}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.purpose}</p>
                <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
                  {(group?.items ?? []).map((item) => (
                    <div key={item.id} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{item.label}</dt>
                      <dd className="font-bold whitespace-nowrap tabular-nums">{formatCurrency(item.annual_amount)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
          {!failed && (
            <button type="button" onClick={() => setPaying(false)} className="text-sm font-bold text-navy-ink hover:underline">
              Back to the fee summary
            </button>
          )}
        </div>
      </StepBody>
    );

  const continueButton = choosing && (
    <>
      <Button size="lg" className="h-12 w-full rounded-xl text-base font-bold" onClick={() => setPaying(true)}>
        Continue to payment
      </Button>
      {!ONLINE_LOCKED && (
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full rounded-xl text-base font-bold"
          disabled={start.isPending || start.isSuccess}
          onClick={() => start.mutate(kind)}
        >
          {(start.isPending || start.isSuccess) && <Loader2Icon className="animate-spin" />}
          Pay {total} online
        </Button>
      )}
      {start.isError && <p className="text-sm text-destructive">{start.error.message}</p>}
    </>
  );

  // What's due: the breakdown on the left, the total and the way forward pinned on the right
  return (
    <StepBody className="@container max-sm:px-4">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-navy-ink sm:text-4xl">{copy.title}.</h2>
          <p className="mt-1 text-muted-foreground">{meta}</p>
        </div>

        <div className="grid items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @3xl:gap-10">
          <aside className="space-y-4 @3xl:sticky @3xl:top-20 @3xl:col-start-2 @3xl:row-start-1">
            {fees.isLoading ? (
              <div className="h-36 animate-pulse rounded-2xl bg-muted" />
            ) : (
              <AmountCard label={copy.total} amount={total} status="Due" note={copy.purpose} />
            )}
            <div className="hidden space-y-3 @3xl:block">{continueButton}</div>
          </aside>

          <div className="space-y-8 @3xl:col-start-1 @3xl:row-start-1">
            {!group?.items.length && !fees.isLoading ? (
              <p className="rounded-2xl bg-muted p-5 text-muted-foreground">
                Fees for {child.grade || "this grade"} at {admission.campus || "your campus"} aren&apos;t published yet. Your counsellor will share them, or call{" "}
                {site.helpLine}.
              </p>
            ) : (
              <div>
                <h3 className="hidden text-xl font-bold text-navy-ink @3xl:block">What it covers</h3>
                <div className="@3xl:mt-2">{feeLines}</div>
              </div>
            )}

            {due && noSlots ? (
              <p className="flex items-start gap-3 rounded-2xl bg-amber-50 p-5 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100" role="status">
                <CalendarXIcon className="mt-0.5 size-5 shrink-0" />
                <span>
                  <span className="block font-bold">No slot available for any date</span>
                  Every visit slot is full right now, so the application fee can&apos;t be paid yet. Please check back soon, or call {site.helpLine}.
                </span>
              </p>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-navy-ink">How it works</h3>
                <ol className="mt-4 grid gap-5 @xl:grid-cols-2">
                  {[
                    ["Make your payment", "Pay by bank transfer or UPI, then upload the receipt."],
                    ["Payment verification", "Admissions checks your receipt and confirms the payment here."],
                  ].map(([title, detail], i) => (
                    <li key={title} className="flex items-start gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-navy-ink tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="pt-0.5">
                        <p className="font-bold">{title}</p>
                        <p className="text-sm text-muted-foreground">{detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="space-y-3 @3xl:hidden">{continueButton}</div>
          </div>
        </div>
      </div>
    </StepBody>
  );
}

/** Two columns on a wide page (status left, details right), stacked on phones and in the drawer */
function Split({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid items-start gap-8 @3xl:grid-cols-2 @3xl:gap-12">
      <div className="space-y-6">{main}</div>
      <div className="space-y-6 @3xl:pt-4">{side}</div>
    </div>
  );
}

// "Ardee Montessori House, Munirka" → "Munirka", as in the design's summary line
const shortCampus = (campus: string) => campus.split(",").pop()?.trim() || campus;

const PRIMARY =
  "flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** The big status at the top of the receipt-submitted and payment-confirmed screens */
function Outcome({ icon: Icon, title, lead, tone, spin }: { icon: typeof ClockIcon; title: string; lead: string; tone?: "good"; spin?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center @3xl:items-start @3xl:text-left">
      <span className={cn("flex size-16 items-center justify-center rounded-full", tone === "good" ? "bg-green-50 text-green-700" : "bg-muted text-navy-ink")}>
        <Icon className={cn("size-7", spin && "animate-spin")} />
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-navy-ink sm:text-4xl">{title}</h2>
      <p className="mt-1 text-muted-foreground">{lead}</p>
    </div>
  );
}

/** The grey card with the amount and where it stands */
function AmountCard({ label, amount, status, tone, note, meta }: { label: string; amount: string; status: string; tone?: "good"; note?: string; meta?: string }) {
  return (
    <div className="rounded-2xl border bg-muted p-5 sm:p-6">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{amount}</p>
        <p className={cn("shrink-0 font-bold", tone === "good" ? "text-green-700" : "text-navy-ink")} role="status">
          {status}
        </p>
      </div>
      {(note || meta) && <p className="mt-1 text-sm text-muted-foreground">{note ?? meta}</p>}
    </div>
  );
}

function LinkCard({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 rounded-2xl border bg-muted p-5 transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <DownloadIcon className="size-6 shrink-0 text-navy-ink" />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{detail}</span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-navy-ink" />
    </a>
  );
}

function Failed({ payment }: { payment: Payment }) {
  return (
    <p className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-5" role="alert">
      <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
      {payment.gateway === "receipt" ? (
        <span>
          <span className="font-bold">Admissions couldn&apos;t accept your receipt.</span>{" "}
          <span className="text-muted-foreground">{payment.failure_reason} Send the right receipt below.</span>
        </span>
      ) : (
        <span>
          <span className="font-bold">Your last payment didn&apos;t go through.</span>{" "}
          <span className="text-muted-foreground">{payment.failure_reason || "The bank declined it."} No money was taken.</span>
        </span>
      )}
    </p>
  );
}

/** Two side-by-side choices, the picked one filled */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className="h-12 rounded-xl border bg-card text-sm text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted aria-checked:border-transparent aria-checked:bg-primary/10 aria-checked:font-bold aria-checked:text-navy-ink"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const RECEIPT_METHODS: { value: ReceiptMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
];

/** Manual payment: the campus's bank account to pay into, then the receipt for admissions to approve.
 * Side by side on a wide page, stacked on phones. */
function ManualPayment({ childId, kind, bank }: { childId: number; kind: Kind; bank: ChildFees["bank"] }) {
  const send = useSendReceipt(childId);
  const [method, setMethod] = useState<ReceiptMethod>("bank_transfer");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const copyText = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copied"));

  return (
    <div className="space-y-8">
      <section aria-labelledby="bank-heading">
        <h3 id="bank-heading" className="text-xl font-bold text-navy-ink">
          School bank details
        </h3>
        {bank ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Confirm the details shown for your selected campus.</p>
            <dl className="mt-2 divide-y border-b">
              {[
                ["Account name", bank.account_name],
                ["Account number", bank.account_number],
                ["IFSC", bank.ifsc],
                ["Bank", [bank.bank_name, bank.branch].filter(Boolean).join(", ")],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="shrink-0">{label}</dt>
                    <dd className="flex min-w-0 items-center gap-1 text-right font-bold">
                      <span className="tabular-nums [overflow-wrap:anywhere]">{value}</span>
                      {(label === "Account number" || label === "IFSC") && (
                        <button
                          type="button"
                          onClick={() => copyText(value)}
                          aria-label={`Copy ${label.toLowerCase()}`}
                          className="rounded-md p-1.5 text-navy-ink transition-colors hover:bg-muted"
                        >
                          <CopyIcon className="size-4" />
                        </button>
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          </>
        ) : (
          <p className="mt-2 rounded-2xl bg-muted p-5 text-muted-foreground">The school&apos;s bank details aren&apos;t set up here yet. Ask your counsellor for them.</p>
        )}
      </section>

      <form
        aria-labelledby="receipt-heading"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!file) return setError("Choose the receipt: a screenshot, photo or PDF.");
          if (file.size > 10 * 1024 * 1024) return setError("The file is larger than 10 MB.");
          setError("");
          send.mutate({ kind, method, file }, { onError: (err) => setError(err.message) });
        }}
      >
        <div>
          <h3 id="receipt-heading" className="text-xl font-bold text-navy-ink">
            Submit proof of payment
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Select the method used.</p>
        </div>
        <Segmented label="How you paid" value={method} options={RECEIPT_METHODS} onChange={setMethod} />
        <label className="block">
          <span className="font-bold">Payment receipt</span>
          <span className="mt-2 flex h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 text-muted-foreground transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/50">
            <UploadIcon className="size-4 shrink-0" />
            <span className={cn("truncate", file && "text-foreground")}>{file ? file.name : "Upload photo or PDF · Up to 10 MB"}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </span>
        </label>
        <p className="text-sm text-muted-foreground">
          Admissions will verify your payment before confirmation.{kind === "registration" && ` ${FINANCE_NOTE}`}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base font-bold" disabled={!file || send.isPending}>
          {send.isPending && <Loader2Icon className="animate-spin" />}
          Submit receipt
        </Button>
      </form>
    </div>
  );
}
