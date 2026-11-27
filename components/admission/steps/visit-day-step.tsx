"use client";

import { format, parseISO } from "date-fns";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CarIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  Loader2Icon,
  MapPinIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format";
import { JOURNEY_STEPS, nextStepNumber } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useDownloadVisitPass } from "@/services/admission.service";
import { StepBody, StepFooter, type StepContentProps } from "./step-layout";

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

/** Step 4: the visit pass, the host, getting here and what to bring. One column in the drawer and on
 * phones; on a wide page the pass stays pinned on the left while the rest scrolls beside it. */
export function VisitDayStep({ admission, state, goNext, page }: StepContentProps) {
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
  const arrive = new Date(starts.getTime() - 10 * 60_000);
  const family = admission.lead.last_name || admission.lead.first_name;
  const childName = `${child.first_name} ${child.last_name}`.trim();
  const museum = slot.visit_type === "museum";
  const campus = visit.campus_name.trim();
  const where = visit.campus_address || campus;
  const mapUrl = `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: where })}`;
  const calendar = calendarUrl(`Campus visit · ${site.school}`, starts, slot.duration_minutes, where);
  const host = slot.staff_names[0];

  return (
    <>
      <StepBody className={cn("@container max-sm:px-4", page && "overflow-visible!")}>
        <div className="grid gap-10 @3xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] @3xl:gap-12">
          {/* The pass: pinned beside the rest on a wide page */}
          <div className={cn("space-y-4 @3xl:sticky @3xl:self-start", page ? "@3xl:top-20" : "@3xl:top-0")}>
            <Heading title={visit.attended_at ? "Thank you for visiting." : "Your visit is booked."} lead="We look forward to welcoming your family." />
            <Ticket
              campus={campus}
              visitType={museum ? "Museum Guide" : "Counsellor-led visit"}
              when={[
                ["Date", format(starts, "d MMM"), format(starts, "EEE yyyy")],
                ["Time", format(starts, "h:mm a").toLowerCase(), `${slot.duration_minutes} min`],
                ["Entrance", slot.gate],
              ]}
              guest={`${childName} · ${child.grade}`}
              family={`${family} family`}
              code={visit.gate_pass_code}
              qr={visit.gate_pass_qr}
              gate={slot.gate}
              reference={child.reference}
              visitedAt={visit.attended_at}
            />
            <Button
              className="h-12 w-full justify-start gap-3 rounded-xl px-4 text-base font-semibold"
              disabled={download.isPending}
              onClick={() => download.mutate(undefined, { onError: (e) => toast.error(e.message) })}
            >
              {download.isPending ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
              <span className="flex-1 text-left">Download visit pass (PDF)</span>
              <ChevronRightIcon />
            </Button>
            <a href={calendar} target="_blank" rel="noreferrer" className={LINK_ROW}>
              <CalendarIcon className="size-5" />
              <span className="flex-1">Add to calendar</span>
              <ChevronRightIcon className="size-4" />
            </a>
          </div>

          <div className="space-y-12">
            <section className="space-y-6">
              <Heading title="Meet your host." lead="A familiar face before you arrive." />
              <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="h-1.5 bg-maroon" />
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-5">
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {host ? <span className="text-2xl font-semibold text-navy-ink">{getInitials(host)}</span> : <UserIcon className="size-9" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wider text-maroon uppercase">Your admissions counsellor</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-navy-ink">{host ?? "We'll share their name soon"}</p>
                      <p className="text-sm text-muted-foreground">{campus}</p>
                    </div>
                  </div>
                  <blockquote className="mt-5 border-t pt-4 font-serif text-xl text-navy-ink italic">
                    &ldquo;I look forward to welcoming you and guiding you through your visit.&rdquo;
                  </blockquote>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Your dedicated point of contact throughout the visit.
                    {slot.staff_names.length > 1 && ` Also joining: ${slot.staff_names.slice(1).join(", ")}.`}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold tracking-tight text-navy-ink">On the day</h3>
                <ol className="mt-5">
                  {[
                    [`Arrive at ${slot.gate}`, `Please arrive at ${format(arrive, "h:mm a").toLowerCase()}, 10 minutes before your visit.`],
                    ["Check in with security", "Show your pass or gate code. Security verifies your details and photo."],
                    ["Meet your counsellor", "They'll welcome you just inside the gate and accompany you on the tour."],
                    ...(museum ? [["Headphones and a short briefing", "Before the museum tour; your counsellor stays with you throughout."]] : []),
                  ].map(([title, detail], i, all) => (
                    <li key={title} className="relative flex gap-4 pb-7 last:pb-0">
                      {i < all.length - 1 && <span aria-hidden className="absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-border" />}
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">{i + 1}</span>
                      <div className="pt-1.5">
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section className="space-y-6">
              <Heading title="Getting here." lead="Everything you need for a smooth arrival." />
              <div className="rounded-2xl border bg-card p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <IconDot icon={MapPinIcon} />
                  <p className="pt-1.5 text-xl font-bold tracking-tight text-navy-ink">{campus}</p>
                </div>
                {visit.campus_address && <p className="mt-3 text-muted-foreground">{visit.campus_address}</p>}
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-navy-ink">
                  <MapPinIcon className="size-4" />
                  Visitor entrance · {slot.gate}
                </p>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex h-12 items-center gap-3 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ArrowUpRightIcon className="size-5" />
                  Open directions
                </a>
              </div>
              <ul className="divide-y">
                <InfoRow icon={CarIcon} title="Visitor parking" detail={`At ${slot.gate}, share your vehicle number plate.`} />
                <InfoRow icon={ClockIcon} title={`Allow ${slot.duration_minutes} minutes`} detail="Plan to arrive 10 minutes early." />
              </ul>
              {visit.campus_vr_link && (
                <div className="rounded-2xl bg-navy p-5 text-white sm:p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white/75 uppercase">
                    <GlobeIcon className="size-5" />
                    Before you arrive
                  </p>
                  <p className="mt-2 font-serif text-3xl">Explore Ardee in 3D.</p>
                  <p className="text-sm text-white/75">Walk through our learning spaces at your own pace.</p>
                  <a
                    href={visit.campus_vr_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex h-12 items-center justify-between rounded-xl bg-white px-4 font-semibold text-navy transition-colors hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
                  >
                    Take the virtual tour
                    <ArrowUpRightIcon className="size-5" />
                  </a>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <Heading title="Ready for your visit?" lead="A few simple things to bring along." />
              <ul className="divide-y rounded-2xl border bg-card px-5">
                <InfoRow icon={SmartphoneIcon} title="Your visit pass" detail="Keep the pass or gate code handy on your phone." />
                <InfoRow icon={UserIcon} title="Bring your child along" detail={`We'd love for ${child.first_name} to join us and experience the campus for themselves.`} />
                <InfoRow icon={CircleCheckIcon} title="Your questions" detail="Your counsellor will note them during the visit." />
              </ul>

              <div>
                <h3 className="text-2xl font-bold tracking-tight text-navy-ink">Make it easy to remember.</h3>
                <div className="mt-4 rounded-2xl bg-muted p-5">
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="mt-0.5 size-5 shrink-0 text-navy-ink" />
                    <div>
                      <p className="text-lg font-bold text-navy-ink">{format(starts, "EEEE, d MMMM")}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(starts, "h:mm a").toLowerCase()} · {slot.duration_minutes} min · {slot.gate}
                      </p>
                    </div>
                  </div>
                  <a
                    href={calendar}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex h-12 items-center gap-3 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <CalendarIcon className="size-5" />
                    <span className="flex-1">Add to calendar</span>
                    <ChevronRightIcon className="size-4" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
                <ShieldCheckIcon className="size-6 shrink-0 text-navy-ink" />
                <div>
                  <p className="font-semibold text-navy-ink">Your privacy matters.</p>
                  <p className="text-sm text-muted-foreground">
                    Gate staff receive only the details needed for security verification, not payments, assessments or admission offers.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </StepBody>

      {state === "done" && (
        <StepFooter>
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {JOURNEY_STEPS[(nextStepNumber(4, admission) ?? 5) - 1].title}
          </Button>
        </StepFooter>
      )}
    </>
  );
}

const LINK_ROW =
  "flex h-12 items-center gap-3 rounded-xl border bg-card px-4 font-semibold text-navy-ink transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <div>
      <h2 className="font-serif text-4xl leading-tight text-navy-ink sm:text-5xl">{title}</h2>
      <p className="mt-1 text-muted-foreground">{lead}</p>
    </div>
  );
}

function IconDot({ icon: Icon }: { icon: typeof UserIcon }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-navy-ink">
      <Icon className="size-5" />
    </span>
  );
}

function InfoRow({ icon, title, detail }: { icon: typeof UserIcon; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-4 py-4">
      <IconDot icon={icon} />
      <div className="min-w-0 pt-0.5">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

// Cuts a half-circle notch into each side of the tear line; real holes, so the shadow follows them
const NOTCHES = {
  WebkitMask:
    "radial-gradient(circle at 0 50%, transparent 11px, #000 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 11px, #000 11.5px) right / 51% 100% no-repeat",
  mask: "radial-gradient(circle at 0 50%, transparent 11px, #000 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 11px, #000 11.5px) right / 51% 100% no-repeat",
};

/** The visit pass as an event ticket: header, the when, the family, a tear line, and the gate stub */
function Ticket({
  campus,
  visitType,
  when,
  guest,
  family,
  code,
  qr,
  gate,
  reference,
  visitedAt,
}: {
  campus: string;
  visitType: string;
  /** label, value, and an optional line under it */
  when: [string, string, string?][];
  guest: string;
  family: string;
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
      className="drop-shadow-[0_18px_28px_color-mix(in_oklab,var(--navy)_18%,transparent)]"
    >
      <header className="rounded-t-[1.75rem] border-b-[6px] border-maroon bg-navy px-6 pt-6 pb-5 text-white">
        <p className="text-xs font-semibold tracking-wider uppercase">Visitor pass</p>
        <h3 className="mt-1 font-serif text-4xl leading-tight">Campus visit</h3>
        <p className="mt-1 text-white/80">{campus}</p>
      </header>

      <div className="relative bg-card px-6 pt-5 pb-4">
        {visitedAt && <VisitedStamp at={visitedAt} />}
        <dl className="grid grid-cols-3 gap-3">
          {when.map(([label, value, sub]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-1 text-lg font-bold tracking-tight whitespace-nowrap tabular-nums sm:text-xl">{value}</dd>
              {sub && <dd className="text-sm text-muted-foreground">{sub}</dd>}
            </div>
          ))}
        </dl>
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Visiting family</p>
          <p className="mt-1 text-lg font-bold">{guest}</p>
          <p className="text-sm text-muted-foreground">
            {family} | {visitType}
          </p>
        </div>
      </div>

      <div aria-hidden className="relative h-6 bg-card" style={NOTCHES}>
        <div className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-border" />
      </div>

      <div className="rounded-b-[1.75rem] bg-card px-6 pt-1 pb-5">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
          <img src={qr} alt={`QR code for gate pass ${code}`} className="size-24 shrink-0 rounded-lg bg-white p-1.5 sm:size-28" />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Gate pass</p>
            <p className="text-3xl font-bold tracking-tight whitespace-nowrap text-navy-ink sm:text-4xl">{code}</p>
            <p className="mt-1 text-sm font-semibold">{visitedAt ? `Checked in at ${gate}.` : `Present at ${gate}.`}</p>
            {!visitedAt && <p className="text-sm text-muted-foreground">Arrive 10 minutes early.</p>}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Ref. {reference}</p>
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
