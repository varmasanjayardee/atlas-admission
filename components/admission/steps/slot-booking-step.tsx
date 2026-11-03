"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CircleAlertIcon, CircleCheckIcon, Loader2Icon, MapPinIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GRADE_STAGE_LABEL } from "@/lib/application-form";
import { cn } from "@/lib/utils";
import type { Slot, VisitBooking } from "@/schemas/auth.schema";
import { useChangeVisit, useChildSlots } from "@/services/admission.service";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";

const time = (slot: Slot) => slot.start_time.slice(0, 5);
const day = (iso: string) => format(parseISO(iso), "EEE d MMM");

/** Step 3: pick a time for a visit with an admission counsellor (the only kind families book), and say if
 * nothing else to choose; once booked, reschedule or cancel until the visit starts */
export function SlotBookingStep({ admission, goNext }: StepContentProps) {
  const child = admission.child!;
  const [changing, setChanging] = useState(false);

  if (child.visit && !changing) {
    return <BookedVisit childId={child.id} visit={child.visit} onReschedule={() => setChanging(true)} goNext={goNext} />;
  }

  return (
    <SlotPicker
      childId={child.id}
      grade={child.grade}
      current={child.visit}
      onDone={() => {
        setChanging(false);
        if (!child.visit) goNext();
      }}
      onBack={child.visit ? () => setChanging(false) : undefined}
    />
  );
}

function SlotPicker({
  childId,
  grade,
  current,
  onDone,
  onBack,
}: {
  childId: number;
  grade: string;
  /** Set when rescheduling */
  current: VisitBooking | null;
  onDone: () => void;
  onBack?: () => void;
}) {
  const slots = useChildSlots(childId);
  const change = useChangeVisit(childId);
  const [date, setDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [filled, setFilled] = useState(false);

  // The server only offers counsellor slots; filtered here too in case an older booking was another type
  const all = (slots.data ?? []).filter((s) => s.visit_type === "counsellor");
  const dates = [...new Set(all.map((s) => s.date))];
  const shownDate = date ?? dates[0];
  const times = all.filter((s) => s.date === shownDate);
  const chosen = all.find((s) => s.id === slotId);
  const stage = GRADE_STAGE_LABEL[grade];

  const confirm = () =>
    chosen &&
    change.mutate(
      { action: current ? "reschedule" : "book", slot: chosen.id },
      {
        onSuccess: () => {
          toast.success(current ? "Visit moved" : "Visit confirmed");
          onDone();
        },
        onError: (error) => {
          // 409: someone took the last place; the list has been refreshed
          setSlotId(null);
          setFilled(true);
          if (!error.message.includes("filled")) toast.error(error.message);
        },
      }
    );

  return (
    <>
      <StepBody className="space-y-7">
        {onBack && (
          <button type="button" onClick={onBack} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Keep my current visit
          </button>
        )}

        <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm">
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold">{stage ? `Dates for ${stage} families` : "Visit dates"}</span>
            <span className="block text-muted-foreground">Next three weeks · no deadline · change it any time before the visit</span>
          </p>
        </div>

        {filled && (
          <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm" role="alert">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>
              <span className="font-semibold">That slot just filled up</span>
              <span className="block text-muted-foreground">Another family booked it a moment ago. The list has been refreshed.</span>
            </p>
          </div>
        )}

        <StepSection title="Date">
          {slots.isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          ) : !dates.length ? (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No visit slots are open for the next three weeks. Your counsellor adds more regularly; check back soon.
            </p>
          ) : (
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={d === shownDate}
                  onClick={() => {
                    setDate(d);
                    setSlotId(null);
                  }}
                  className="flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {format(parseISO(d), "EEE")}
                  <span className="text-lg font-semibold">{format(parseISO(d), "d")}</span>
                  {format(parseISO(d), "MMM")}
                </button>
              ))}
            </div>
          )}
        </StepSection>

        {!!dates.length && (
          <StepSection title="Times">
            {!times.length ? (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No slots on this day. Try another date.</p>
            ) : (
              <ul className="space-y-2">
                {times.map((s) => {
                  const full = s.places_left === 0 && s.id !== current?.slot.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={full}
                        aria-pressed={slotId === s.id}
                        onClick={() => {
                          setSlotId(s.id);
                          setFilled(false);
                        }}
                        className="flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:ring-1 aria-pressed:ring-primary"
                      >
                        <span className="w-14 text-lg font-semibold tabular-nums">{time(s)}</span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-medium">{s.visit_type_label}</span>
                          <span className="block truncate text-muted-foreground">
                            {[s.gate, ...s.staff_names].join(" · ")}
                          </span>
                        </span>
                        <span className={cn("text-xs font-medium", full ? "text-destructive" : "text-muted-foreground")}>
                          {s.id === current?.slot.id ? "Your slot" : full ? "Full" : `${s.places_left} of ${s.capacity} left`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </StepSection>
        )}
      </StepBody>

      <StepFooter>
        <Button
          size="lg"
          className="h-12 rounded-xl text-base font-semibold"
          disabled={!chosen || chosen.id === current?.slot.id || change.isPending}
          onClick={confirm}
        >
          {change.isPending && <Loader2Icon className="animate-spin" />}
          {chosen ? `${current ? "Move to" : "Confirm"} ${time(chosen)} on ${day(chosen.date)}` : "Choose a time"}
        </Button>
      </StepFooter>
    </>
  );
}

function BookedVisit({
  childId,
  visit,
  onReschedule,
  goNext,
}: {
  childId: number;
  visit: VisitBooking;
  onReschedule: () => void;
  goNext: () => void;
}) {
  const change = useChangeVisit(childId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { slot } = visit;

  const cancel = () =>
    change.mutate(
      { action: "cancel" },
      { onSuccess: () => toast.success("Visit cancelled. Book a new time whenever you're ready."), onError: (e) => toast.error(e.message) }
    );

  const rows = [
    { label: "Date", value: format(parseISO(slot.date), "EEEE d MMMM") },
    { label: "Time", value: `${time(slot)} · about ${slot.duration_minutes} minutes` },
    { label: "Visit", value: slot.visit_type_label },
    { label: "Gate", value: slot.gate },
    slot.staff_names.length > 0 && { label: "You'll meet", value: slot.staff_names.join(", ") },
    { label: "Gate pass", value: <span className="font-mono tracking-widest">{visit.gate_pass_code}</span> },
  ].filter((row) => !!row);

  return (
    <>
      <StepBody>
        <div className="flex items-start gap-3 rounded-xl bg-primary/10 p-4">
          <CircleCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">
              {visit.status === "attended" ? "Visited" : "Visit confirmed"} · {day(slot.date)} at {time(slot)}
            </p>
            <p className="text-muted-foreground">
              {visit.status === "attended"
                ? "Thanks for coming. The admissions team is reviewing your application."
                : `Arrive 10 minutes early and show your gate pass at ${slot.gate}.`}
            </p>
          </div>
        </div>

        <StepSection title="Your visit">
          <dl className="rounded-xl bg-muted/60 px-4 py-1">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-foreground/5 py-3 last:border-0">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </StepSection>

        {visit.status === "attended" ? null : confirmCancel ? (
          <div className="space-y-3 rounded-xl border border-destructive/30 p-4" role="alert">
            <p className="text-sm font-medium">Cancel this visit? Your place goes to another family. You can book a new time after.</p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={cancel} disabled={change.isPending}>
                {change.isPending && <Loader2Icon className="animate-spin" />}
                Cancel visit
              </Button>
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onReschedule}>
              Reschedule
            </Button>
            <Button variant="outline" className="rounded-xl text-destructive" onClick={() => setConfirmCancel(true)}>
              Cancel visit
            </Button>
          </div>
        )}
      </StepBody>

      <StepFooter>
        <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
          Open your visit pass
        </Button>
      </StepFooter>
    </>
  );
}
