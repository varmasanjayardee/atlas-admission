"use client";

import { format, parseISO } from "date-fns";
import {
  CalendarPlusIcon,
  CarIcon,
  CircleCheckIcon,
  ClockIcon,
  DownloadIcon,
  HeadphonesIcon,
  Loader2Icon,
  MapPinIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { useDownloadVisitPass } from "@/services/admission.service";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";

type Row = { icon: typeof UserIcon; title: React.ReactNode; detail?: React.ReactNode; action?: React.ReactNode };

export function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {rows.map(({ icon: Icon, title, detail, action }, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium">{title}</span>
            {detail && <span className="block text-muted-foreground">{detail}</span>}
          </span>
          {action}
        </li>
      ))}
    </ul>
  );
}

// Google Calendar link; nothing personal in it, just the visit
export function calendarUrl(title: string, start: Date, minutes: number, where: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = new Date(start.getTime() + minutes * 60_000);
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}`, location: where });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Step 4: the visit pass (downloadable PDF) and everything needed on the day */
export function VisitDayStep({ admission, state, goNext }: StepContentProps) {
  const child = admission.child!;
  const visit = child.visit;
  const download = useDownloadVisitPass(child.id);

  if (!visit) {
    return (
      <StepBody>
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Book a visit first; your pass appears here.
        </p>
      </StepBody>
    );
  }

  const { slot } = visit;
  const starts = parseISO(`${slot.date}T${slot.start_time}`);
  const time = slot.start_time.slice(0, 5);
  const family = admission.lead.last_name || admission.lead.first_name;
  const childName = `${child.first_name} ${child.last_name}`.trim();
  const museum = slot.visit_type === "museum";
  const mapUrl = `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: visit.campus_address || visit.campus_name })}`;

  return (
    <>
      <StepBody>
        <div className="rounded-2xl bg-muted/70 px-4 py-6">
          <Ticket
            image={visit.campus_image}
            campus={visit.campus_name.trim()}
            visitType={museum ? "Museum Guide" : "Counsellor-led"}
            when={[
              ["Date", format(starts, "EEE d MMM")],
              ["Time", time],
              ["Gate", slot.gate],
            ]}
            guest={`${childName} · ${child.grade}`}
            party={[`${family} family`, `${slot.duration_minutes} min`, slot.staff_names[0] && `meeting ${slot.staff_names[0]}`]
              .filter(Boolean)
              .join(" · ")}
            code={visit.gate_pass_code}
            qr={visit.gate_pass_qr}
            gate={slot.gate}
            reference={child.reference}
            visitedAt={visit.attended_at}
          />
        </div>

        <Button
          className="h-11 w-full rounded-xl"
          disabled={download.isPending}
          onClick={() => download.mutate(undefined, { onError: (e) => toast.error(e.message) })}
        >
          {download.isPending ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          Download ticket (PDF)
        </Button>

        <StepSection title="On the day">
          <Rows
            rows={[
              {
                icon: SmartphoneIcon,
                title: `At ${slot.gate}, show this pass or tell security your code`,
                detail: "Security checks your details and photo. The PDF has a QR code they can scan.",
              },
              {
                icon: MapPinIcon,
                title: "Your counsellor meets you just inside the gate",
                detail: "A member of our team walks with you from there.",
              },
              ...(museum
                ? [{ icon: HeadphonesIcon, title: "Headphones and a short briefing before the tour", detail: "Your counsellor accompanies you throughout." }]
                : []),
            ]}
          />
        </StepSection>

        <StepSection title="Who you will meet">
          <Rows
            rows={
              slot.staff_names.length
                ? slot.staff_names.map((name, i) => ({
                    icon: UserIcon,
                    title: (
                      <span className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
                          {getInitials(name)}
                        </span>
                        {name}
                      </span>
                    ),
                    detail: i === 0 ? "Admission counsellor · meets you at the gate" : "Joins your visit",
                  }))
                : [{ icon: UserIcon, title: "Your admission counsellor", detail: "We'll share their name before the visit." }]
            }
          />
        </StepSection>

        <StepSection title="Getting there">
          <Rows
            rows={[
              {
                icon: MapPinIcon,
                title: visit.campus_name,
                detail: `${visit.campus_address} · use ${slot.gate}`,
                action: (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-primary hover:underline">
                    Map
                  </a>
                ),
              },
              { icon: CarIcon, title: "Parking", detail: `Visitor parking at ${slot.gate}. Give your number plate at the gate.` },
              {
                icon: ClockIcon,
                title: "Arrive 10 minutes early",
                detail: `Checking in takes about a minute. The visit lasts about ${slot.duration_minutes} minutes.`,
              },
            ]}
          />
        </StepSection>

        <StepSection title="What to bring">
          <Rows
            rows={[
              { icon: SmartphoneIcon, title: "Your phone, with this pass or its code" },
              { icon: UserIcon, title: `${child.first_name}, if you'd like to`, detail: "Children are welcome on the tour." },
              { icon: CircleCheckIcon, title: "Any questions you want answered", detail: "Your counsellor notes them so nothing is lost." },
            ]}
          />
        </StepSection>

        <a
          href={calendarUrl(`Campus visit · ${site.school}`, starts, slot.duration_minutes, visit.campus_address || visit.campus_name)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          <CalendarPlusIcon className="size-4" />
          Add to calendar
        </a>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
          Your details are shared with the school gate for security verification only. Gate staff don&apos;t see payments, assessments or
          offers.
        </p>
      </StepBody>

      {state === "done" && (
        <StepFooter>
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {JOURNEY_STEPS[4].title}
          </Button>
        </StepFooter>
      )}
    </>
  );
}

// Cuts a half-circle notch into each side of the tear line; real holes, so the shadow follows them
const NOTCHES = {
  WebkitMask:
    "radial-gradient(circle at 0 50%, transparent 11px, #000 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 11px, #000 11.5px) right / 51% 100% no-repeat",
  mask: "radial-gradient(circle at 0 50%, transparent 11px, #000 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 11px, #000 11.5px) right / 51% 100% no-repeat",
};

/** The visit pass as an event ticket: poster, the when, a tear line, and the gate stub */
function Ticket({
  image,
  campus,
  visitType,
  when,
  guest,
  party,
  code,
  qr,
  gate,
  reference,
  visitedAt,
}: {
  image: string | null;
  campus: string;
  visitType: string;
  when: [string, string][];
  guest: string;
  party: string;
  code: string;
  qr: string;
  gate: string;
  reference: string;
  /** Set once the gate checks them in: the ticket gets a stamp */
  visitedAt: string | null;
}) {
  return (
    <article
      aria-label={visitedAt ? "Visit pass, visited" : "Visit pass"}
      className="mx-auto max-w-sm drop-shadow-[0_18px_28px_color-mix(in_oklab,var(--navy)_22%,transparent)]"
    >
      <header className="relative isolate h-44 overflow-hidden rounded-t-[1.75rem] bg-navy text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- presigned bucket URL */}
        {image && <img src={image} alt="" className="absolute inset-0 -z-10 size-full object-cover" />}
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-navy via-navy/70 to-navy/15" />
        <div className="absolute inset-x-5 bottom-4">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-navy">{visitType}</span>
          <h3 className="mt-2.5 font-serif text-[2rem] leading-none italic">Campus visit</h3>
          <p className="mt-1 text-sm text-white/75">{campus}</p>
        </div>
      </header>

      <div className="relative bg-card px-5 pt-5 pb-3">
        {visitedAt && <VisitedStamp at={visitedAt} />}
        <dl className="grid grid-cols-3 gap-3">
          {when.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="truncate text-xl font-bold tracking-tight tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 border-t pt-3">
          <p className="font-semibold">{guest}</p>
          <p className="text-sm text-muted-foreground">{party}</p>
        </div>
      </div>

      <div aria-hidden className="relative h-6 bg-card" style={NOTCHES}>
        <div className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-border" />
      </div>

      <div className="flex items-center gap-4 rounded-b-[1.75rem] bg-card px-5 pt-1 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
        <img src={qr} alt={`QR code for gate pass ${code}`} className="size-28 shrink-0 rounded-lg bg-white p-1.5 ring-1 ring-border" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Gate pass</p>
          <p className="font-mono text-3xl font-bold tracking-[0.18em] text-navy">{code}</p>
          <p className="mt-1 text-sm">{visitedAt ? `Checked in at ${gate}` : `Show at ${gate}, 10 minutes early`}</p>
          <p className="text-xs text-muted-foreground">Booking {reference}</p>
        </div>
      </div>
    </article>
  );
}

/** Rubber stamp over the ticket body once the visit is checked in */
function VisitedStamp({ at }: { at: string }) {
  return (
    <div
      role="img"
      aria-label={`Visited, checked in ${format(parseISO(at), "d MMMM yyyy 'at' h:mm a")}`}
      className="pointer-events-none absolute top-11 right-3 z-10 rotate-[-12deg] rounded-xl border-4 border-green-700 bg-green-50/85 p-1 text-green-700 shadow-sm motion-safe:animate-[stamp_0.5s_cubic-bezier(0.2,0.9,0.3,1.2)_both]"
    >
      <div className="rounded-lg border-2 border-green-700 px-4 py-1.5 text-center">
        <p className="text-2xl leading-none font-black tracking-[0.14em]">VISITED</p>
        <p className="mt-1 text-[0.65rem] font-bold tracking-wider tabular-nums">{format(parseISO(at), "d MMM yyyy · HH:mm").toUpperCase()}</p>
      </div>
    </div>
  );
}
