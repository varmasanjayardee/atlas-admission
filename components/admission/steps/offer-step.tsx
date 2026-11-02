"use client";

import { useState } from "react";
import { differenceInCalendarDays, differenceInHours, format, parseISO } from "date-fns";
import { CalendarClockIcon, CircleCheckIcon, CircleXIcon, Loader2Icon, ShieldCheckIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { feeNote, formatCurrency } from "@/lib/format";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Child } from "@/schemas/auth.schema";
import { DECLINE_REASONS, useAnswerOffer, useChildFees } from "@/services/admission.service";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";

const long = (iso: string) => format(parseISO(iso), "EEEE d MMMM yyyy");
const short = (iso: string) => format(parseISO(iso), "d MMM yyyy");

/** Step 6: the offer letter, its fees, and accept / extend / decline */
export function OfferStep({ admission, goNext }: StepContentProps) {
  const child = admission.child!;
  const fees = useChildFees(child.id);
  const answer = useAnswerOffer(child.id);
  const [agreed, setAgreed] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<(typeof DECLINE_REASONS)[number] | "">("");
  // When the drawer opened; good enough for a countdown measured in days
  const [now] = useState(() => Date.now());

  const expiresAt = child.offer_expires_at;
  const expired = !!expiresAt && parseISO(expiresAt).getTime() < now;
  const open = child.outcome === "offered" && !child.offer_accepted_at && !expired;
  const registrationPaid = child.payments.find((p) => p.kind === "registration" && p.status === "success");
  const parentFirst = admission.lead.first_name;
  const childName = `${child.first_name} ${child.last_name}`.trim();

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
      <StepBody>
        <Status child={child} expired={expired} />

        {/* The letter */}
        <article className="overflow-hidden rounded-2xl bg-card shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--navy)_30%,transparent)] ring-1 ring-foreground/5">
          {child.offer_sent_at && expiresAt && <ValidityMeter from={child.offer_sent_at} to={expiresAt} now={now} extended={!!child.offer_extended_at} live={open} />}
          <div className="px-6 pt-6 pb-5">
            <p className="font-serif text-xl text-navy italic">{site.school}</p>
            <h3 className="mt-4 text-2xl leading-tight font-bold tracking-tight text-balance">An offer of a place for {childName}</h3>
            <div className="mt-4 space-y-3 leading-relaxed text-foreground/90">
              <p>Dear {parentFirst},</p>
              <p>
                We are delighted to offer {child.first_name} a place in <strong>{child.grade}</strong> at {admission.campus || "the school"}
                {child.academic_year_name && <> for the {child.academic_year_name} academic year</>}.
                {expiresAt && (
                  <>
                    {" "}
                    This offer is valid until <strong>{long(expiresAt)}</strong>.
                  </>
                )}
              </p>
              {child.review_note && <p className="italic">{child.review_note}</p>}
            </div>
            <p className="mt-5 font-serif text-lg text-navy italic">Admissions, {site.school}</p>
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              {child.offer_sent_at && `Issued ${short(child.offer_sent_at)} · `}Application {child.reference}
            </p>
          </div>
        </article>

        <StepSection title="Fees">
          {fees.isLoading ? (
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          ) : (
            <dl className="divide-y rounded-xl border px-4">
              {(fees.data?.admission.items ?? []).map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">
                    {item.label}
                    {feeNote(item) && <span className="block text-xs">{feeNote(item)}</span>}
                  </dt>
                  <dd className="font-medium tabular-nums">{formatCurrency(item.annual_amount)}</dd>
                </div>
              ))}
              {fees.data && (
                <div className="flex justify-between gap-4 py-3 text-sm font-semibold">
                  <dt>Due after you accept</dt>
                  <dd className="tabular-nums">{formatCurrency(fees.data.admission.total)}</dd>
                </div>
              )}
              {registrationPaid && (
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">Registration fee</dt>
                  <dd className="font-medium text-green-700">Paid · {formatCurrency(registrationPaid.amount)}</dd>
                </div>
              )}
              {!fees.data && (
                <p className="py-3 text-sm text-muted-foreground">Your counsellor will share the fee details with you.</p>
              )}
            </dl>
          )}
        </StepSection>

        <StepSection title="What accepting means">
          <ul className="space-y-3 text-sm">
            {[
              { icon: ShieldCheckIcon, text: `${child.first_name}'s place in ${child.grade} is held for you.` },
              {
                icon: WalletIcon,
                text: `Next, pay the admission fee${fees.data ? ` of ${formatCurrency(fees.data.admission.total)}` : ""} to confirm it.`,
              },
              { icon: CalendarClockIcon, text: "We record when you accepted, and who accepted, against this offer." },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </StepSection>

        {open && declining && (
          <section className="space-y-3 rounded-xl border border-destructive/30 p-4" aria-label="Decline the offer">
            <p className="text-sm font-medium">Decline this offer? The application closes and the place goes to another family.</p>
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
          </section>
        )}
      </StepBody>

      <StepFooter>
        {child.offer_accepted_at ? (
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {JOURNEY_STEPS[6].title}
          </Button>
        ) : open ? (
          <>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I&apos;ve read the offer and what accepting means.
            </label>
            <Button
              size="lg"
              className="h-12 rounded-xl text-base font-semibold"
              disabled={!agreed || answer.isPending}
              onClick={() => send({ action: "accept", agreed: true }, `Offer accepted. Welcome to ${site.school}!`)}
            >
              {answer.isPending && <Loader2Icon className="animate-spin" />}
              Accept offer
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={!!child.offer_extended_at || answer.isPending}
                onClick={() => send({ action: "extend" }, "Offer extended by 7 days")}
                title={child.offer_extended_at ? "The offer can be extended once" : undefined}
              >
                {child.offer_extended_at ? "Extended once" : "Extend by 7 days"}
              </Button>
              <Button variant="outline" className="rounded-xl text-destructive" onClick={() => setDeclining(true)} disabled={declining}>
                Decline offer
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Questions? Email{" "}
            <a href={`mailto:${site.helpEmail}`} className="font-medium text-primary hover:underline">
              {site.helpEmail}
            </a>
          </p>
        )}
      </StepFooter>
    </>
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

/** Time left on the offer, as a bar that drains across the letter's top edge */
function ValidityMeter({ from, to, now, extended, live }: { from: string; to: string; now: number; extended: boolean; live: boolean }) {
  const start = parseISO(from).getTime();
  const end = parseISO(to).getTime();
  const left = Math.max(0, Math.min(1, (end - now) / (end - start)));
  const days = differenceInCalendarDays(end, now);
  const hours = differenceInHours(end, now);
  const urgent = live && days <= 2;

  return (
    <div className={cn("border-b px-6 py-3", urgent ? "bg-amber-50" : "bg-muted/50")}>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-semibold", urgent ? "text-amber-800" : "text-foreground")}>
          {!live ? "Offer closed" : days >= 1 ? `${days} day${days === 1 ? "" : "s"} left to accept` : `${Math.max(hours, 0)} hours left to accept`}
        </span>
        <span className="text-muted-foreground">
          {extended && "Extended once · "}Until {format(parseISO(to), "d MMM, h:mm a")}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuenow={Math.round(left * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Time left on the offer">
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-700 ease-out starting:scale-x-0 motion-reduce:transition-none",
            urgent ? "bg-amber-500" : "bg-primary"
          )}
          style={{ transform: `scaleX(${live ? left : 0})` }}
        />
      </div>
    </div>
  );
}
