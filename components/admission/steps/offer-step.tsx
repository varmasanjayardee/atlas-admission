"use client";

import { useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarIcon, ChevronRightIcon, CircleCheckIcon, CircleXIcon, ClockIcon, FileTextIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { feeNote, formatCurrency } from "@/lib/format";
import { JOURNEY_STEPS, offerExpired } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Child } from "@/schemas/auth.schema";
import { DECLINE_REASONS, useAnswerOffer, useChildFees } from "@/services/admission.service";
import { StepBody, StepFooter, type StepContentProps } from "./step-layout";

const short = (iso: string) => format(parseISO(iso), "d MMM yyyy");

// Invoiced separately, from the campus fee schedule; not part of the offer total
const ADDITIONAL_CHARGES = [
  ["One-time charges", "PSA fee · Class photograph · Security & safety"],
  ["Other charges", "RFID tag · Meal fee · Atlas fee · After-school enrichment programme"],
  ["If availed", "Swimming · Transport"],
] as const;

/** Step 7: the offer, its fees, then review and accept (or extend, or decline). One column in the drawer
 * and on phones; on a wide page the offer sits on the left with fees and acceptance beside it. */
export function OfferStep({ admission, goNext, page }: StepContentProps) {
  const child = admission.child!;
  const fees = useChildFees(child.id);
  const answer = useAnswerOffer(child.id);
  const [agreed, setAgreed] = useState(false);
  const [terms, setTerms] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<(typeof DECLINE_REASONS)[number] | "">("");
  // When the step opened; good enough for a countdown measured in days
  const [now] = useState(() => Date.now());

  const expiresAt = child.offer_expires_at;
  const expired = offerExpired(child, now);
  const open = child.outcome === "offered" && !child.offer_accepted_at && !expired;
  const registrationPaid = child.payments.find((p) => p.kind === "registration" && p.status === "success");
  const childName = `${child.first_name} ${child.last_name}`.trim();
  const campus = admission.campus || "the school";
  const items = fees.data?.admission.items ?? [];
  const total = fees.data ? formatCurrency(fees.data.admission.total) : null;
  const days = expiresAt ? differenceInCalendarDays(parseISO(expiresAt), now) : null;
  const ready = agreed && terms;

  const send = (body: Parameters<typeof answer.mutate>[0], done: string) =>
    answer.mutate(body, {
      onSuccess: () => {
        toast.success(done);
        if (body.action === "accept") goNext();
      },
      onError: (e) => toast.error(e.message),
    });

  return (
    <>
      <StepBody className={cn("@container max-sm:px-4", page && "overflow-visible!")}>
        <Status child={child} expired={expired} />

        <div className="grid gap-12 @3xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] @3xl:gap-12">
          {/* The offer; on a wide page it sits beside fees and acceptance. Not pinned: it's taller than a laptop screen */}
          <section className="space-y-6">
            <div>
              {child.academic_year_name && (
                <p className="text-xs font-bold tracking-wider text-maroon uppercase">Admissions {child.academic_year_name}</p>
              )}
              <h2 className="mt-2 text-3xl leading-tight font-bold tracking-tight text-balance text-navy-ink sm:text-4xl">An offer for {childName}.</h2>
              <p className="mt-2 text-muted-foreground">
                We are delighted to offer your child a place at {campus}.
              </p>
            </div>

            <article className="rounded-2xl bg-muted p-5 sm:p-6">
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Offer of admission</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{childName}</p>
              <p className="mt-1 text-muted-foreground">
                {child.grade}
                {child.academic_year_name && <span className="whitespace-nowrap"> · Academic year {child.academic_year_name}</span>}
              </p>
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Campus</p>
                <p className="mt-1 text-lg font-bold">{campus}</p>
              </div>
              <p className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {child.offer_sent_at && <span>Issued {short(child.offer_sent_at)}</span>}
                <span className="tabular-nums">{child.reference}</span>
              </p>
            </article>

            {expiresAt && open && (
              <div className="flex items-start gap-3">
                <IconDot icon={ClockIcon} />
                <div className="pt-0.5">
                  <p className="text-lg font-bold">Accept by {format(parseISO(expiresAt), "EEEE, d MMMM")}</p>
                  <p className={cn("text-muted-foreground", days !== null && days <= 2 && "font-semibold text-amber-800")}>
                    {format(parseISO(expiresAt), "yyyy, h:mm a").replace("AM", "am").replace("PM", "pm")}
                    {days !== null && ` · ${days >= 1 ? `${days} day${days === 1 ? "" : "s"} remaining` : "ends today"}`}
                    {child.offer_extended_at && " · extended once"}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 border-t pt-6">
              <p className="font-bold">Dear Parent,</p>
              <p className="text-muted-foreground">
                We look forward to welcoming your family to our community. Please review your offer, fees and terms before accepting
                your child&apos;s place.
              </p>
              {child.review_note && <p className="whitespace-pre-line text-muted-foreground">{child.review_note}</p>}
              <p className="text-muted-foreground">
                Warm regards,
                <br />
                Admissions Team
              </p>
            </div>

            {open && (
              <div className="space-y-4 border-t pt-6 @3xl:hidden">
                <div>
                  <p className="flex justify-between gap-4 font-bold">
                    <span>Next: review your fees</span>
                    {total && <span className="text-lg tabular-nums">{total}</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">Payable after you accept the offer.</p>
                </div>
                <a href="#offer-fees" className={PRIMARY_LINK}>
                  <span className="flex-1">Review fees and terms</span>
                  <ChevronRightIcon className="size-5" />
                </a>
              </div>
            )}
          </section>

          <div className="space-y-12">
            <section id="offer-fees" className="scroll-mt-24 space-y-6">
              <Heading title="Fees and payment." lead="Review the amount payable after acceptance." />
              {fees.isLoading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-muted" />
              ) : fees.data ? (
                <>
                  <div className="rounded-2xl bg-muted p-5 sm:p-6">
                    <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Due after you accept</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{total}</p>
                    {items.some((i) => i.is_refundable) && <p className="mt-1 text-sm text-muted-foreground">Includes the refundable deposit.</p>}
                  </div>
                  <dl className="divide-y border-b">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-4 py-4">
                        <dt>
                          {item.label}
                          {feeNote(item) && <span className="block text-sm text-muted-foreground">{feeNote(item)}</span>}
                        </dt>
                        <dd className="font-bold whitespace-nowrap tabular-nums">{formatCurrency(item.annual_amount)}</dd>
                      </div>
                    ))}
                    {registrationPaid && (
                      <div className="flex justify-between gap-4 py-4">
                        <dt>
                          Application fee
                          <span className="block text-sm text-muted-foreground">Already paid; not included in the amount above.</span>
                        </dt>
                        <dd className="font-bold whitespace-nowrap text-green-700 tabular-nums">Paid · {formatCurrency(registrationPaid.amount)}</dd>
                      </div>
                    )}
                  </dl>
                </>
              ) : (
                <p className="rounded-2xl bg-muted p-5 text-muted-foreground">Your counsellor will share the fee details with you.</p>
              )}

              <div>
                <h3 className="text-xl font-bold">Additional charges</h3>
                <p className="mt-1 text-muted-foreground">These will be invoiced separately, in accordance with your campus fee schedule.</p>
                <dl className="mt-4 space-y-4">
                  {ADDITIONAL_CHARGES.map(([group, list]) => (
                    <div key={group}>
                      <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{group}</dt>
                      <dd className="mt-1 text-muted-foreground">{list}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            <section className="space-y-6">
              <Heading title="Review and accept." lead="Please review the terms and confirm your decision." />

              {child.offer_terms_url && (
                <a
                  href={child.offer_terms_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl bg-muted p-5 transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <FileTextIcon className="size-6 shrink-0 text-navy-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold">Terms and conditions</span>
                    <span className="block text-sm text-muted-foreground">
                      {child.terms_accepted_at ? `Accepted on ${short(child.terms_accepted_at)}` : "Read the PDF before accepting."}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-5 shrink-0 text-navy-ink" />
                </a>
              )}

              <div>
                <h3 className="text-xl font-bold">What accepting means</h3>
                <ul className="mt-4 space-y-6">
                  {[
                    { icon: CircleCheckIcon, title: "Your child's place will be held", detail: `${childName}'s place in ${child.grade} will be held for you.` },
                    {
                      icon: ShieldCheckIcon,
                      title: "Complete the admission payment",
                      detail: `Pay ${total ?? "the admission fee"} at the next step to confirm the place.`,
                    },
                    { icon: CalendarIcon, title: "Acceptance is recorded", detail: "We keep a record of who accepted and when." },
                  ].map(({ icon, title, detail }) => (
                    <li key={title} className="flex items-start gap-4">
                      <IconDot icon={icon} />
                      <div className="pt-0.5">
                        <p className="font-bold">{title}</p>
                        <p className="text-sm text-muted-foreground">{detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {open && (
                <div className="space-y-4 border-t pt-6">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    I have read the offer and understand what accepting means.
                  </label>
                  <label className="flex items-start gap-3">
                    <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                    <span>
                      I accept the{" "}
                      {child.offer_terms_url ? (
                        <a href={child.offer_terms_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
                          terms and conditions
                        </a>
                      ) : (
                        "terms and conditions"
                      )}
                      .
                    </span>
                  </label>
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-xl text-base font-bold"
                    disabled={!ready || answer.isPending}
                    onClick={() => send({ action: "accept", agreed: true, terms_accepted: true }, `Offer accepted. Welcome to ${site.school}.`)}
                  >
                    {answer.isPending && <Loader2Icon className="animate-spin" />}
                    Accept offer
                  </Button>
                  {!ready && <p className="text-center text-sm text-muted-foreground">Select both confirmations to continue.</p>}

                  <div className="flex items-start justify-between gap-4 border-t pt-4">
                    <div>
                      <p className="font-bold">Need more time?</p>
                      <p className="text-sm text-muted-foreground">
                        {child.offer_extended_at ? "The offer has already been extended once." : "One extension is available."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!child.offer_extended_at && (
                        <button
                          type="button"
                          className="font-bold whitespace-nowrap text-navy-ink hover:underline disabled:opacity-50"
                          disabled={answer.isPending}
                          onClick={() => send({ action: "extend" }, "Offer extended by 7 days")}
                        >
                          Extend by 7 days
                        </button>
                      )}
                      <button type="button" className="text-sm whitespace-nowrap text-maroon hover:underline" onClick={() => setDeclining(true)} disabled={declining}>
                        Decline offer
                      </button>
                    </div>
                  </div>

                  {declining && (
                    <div className="space-y-3 rounded-2xl border border-destructive/30 p-4" aria-label="Decline the offer">
                      <p className="font-medium">Decline this offer? The application closes and the place goes to another family.</p>
                      <label className="block text-sm">
                        <span className="text-muted-foreground">Why are you declining?</span>
                        <select
                          className="mt-1 h-11 w-full rounded-lg border bg-transparent px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          value={reason}
                          onChange={(e) => setReason(e.target.value as typeof reason)}
                        >
                          <option value="">Choose</option>
                          {DECLINE_REASONS.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          disabled={!reason || answer.isPending}
                          onClick={() => reason && send({ action: "decline", reason }, "Offer declined. Thank you for telling us.")}
                        >
                          Decline offer
                        </Button>
                        <Button variant="outline" onClick={() => setDeclining(false)}>
                          Keep the offer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </StepBody>

      {child.offer_accepted_at ? (
        <StepFooter>
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {JOURNEY_STEPS[7].title}
          </Button>
        </StepFooter>
      ) : (
        !open && (
          <StepFooter>
            <p className="text-center text-sm text-muted-foreground">
              Questions? Call{" "}
              <a href={`tel:${site.helpLine}`} className="font-medium text-primary hover:underline">
                {site.helpLine}
              </a>
            </p>
          </StepFooter>
        )
      )}
    </>
  );
}

const PRIMARY_LINK =
  "flex h-12 items-center gap-3 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <div>
      <h2 className="text-3xl leading-tight font-bold tracking-tight text-navy-ink sm:text-4xl">{title}</h2>
      <p className="mt-2 text-muted-foreground">{lead}</p>
    </div>
  );
}

function IconDot({ icon: Icon }: { icon: typeof ClockIcon }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-navy-ink">
      <Icon className="size-5" />
    </span>
  );
}

/** One line on where the offer stands, above the letter */
function Status({ child, expired }: { child: Child; expired: boolean }) {
  const states = child.offer_accepted_at
    ? { icon: CircleCheckIcon, tone: "bg-green-50 text-green-800", text: `You accepted this offer on ${short(child.offer_accepted_at)}.` }
    : child.outcome === "declined" && child.offer_declined_at
      ? { icon: CircleXIcon, tone: "bg-muted text-muted-foreground", text: `You declined this offer on ${short(child.offer_declined_at)} (${child.offer_decline_reason.toLowerCase()}).` }
      : child.outcome === "withdrawn" || expired
        ? {
            icon: CircleXIcon,
            tone: "bg-red-50 text-red-800",
            text: `This offer expired${child.offer_expires_at ? ` on ${short(child.offer_expires_at)}` : ""}. Contact admissions to reopen it.`,
          }
        : null;

  if (!states) return null;
  const Icon = states.icon;
  return (
    <p className={cn("flex items-start gap-2 rounded-xl p-3 text-sm font-medium", states.tone)} role="status">
      <Icon className="mt-0.5 size-4 shrink-0" />
      {states.text}
    </p>
  );
}
