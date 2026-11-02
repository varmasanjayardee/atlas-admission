import { CalendarIcon, FileTextIcon, MailIcon, PhoneIcon } from "lucide-react";
import { formatIdentifier } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Lead, OtpChannel } from "@/schemas/auth.schema";

const sectionLabel = "text-xs font-semibold tracking-[0.2em] uppercase";
const card = "rounded-2xl bg-card text-card-foreground shadow-lg";

const VERIFY = {
  sms: { icon: PhoneIcon, title: "Verify your mobile", detail: "A one-time password (OTP) sent directly to your phone" },
  email: { icon: MailIcon, title: "Verify your email", detail: "A one-time password (OTP) sent to your email" },
};

const NEXT_STEPS = [
  { icon: FileTextIcon, title: "Complete the form", detail: "Saved automatically as you go, finish any time" },
  { icon: CalendarIcon, title: "Pay the fee, then book your visit", detail: "Rs 1,000 registration and campus visit booking" },
];

export function EnquiryOverview({ lead }: { lead: Lead }) {
  const children = lead.children.map((child) =>
    [`${child.first_name} ${child.last_name}`.trim(), child.grade].filter(Boolean).join(" · ")
  );

  const rows = [
    { label: "Parent", value: <span className="font-semibold">{`${lead.first_name} ${lead.last_name}`.trim()}</span> },
    { label: "Mobile", value: <span className="font-semibold tabular-nums">{formatIdentifier(lead.phone_number)}</span> },
    { label: "Email", value: <span className="font-semibold break-all">{lead.email}</span> },
    lead.campus && { label: "Campus", value: <span className="font-semibold">{lead.campus}</span> },
    {
      label: "Enquiry",
      value: (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {lead.enquiry_type.charAt(0).toUpperCase() + lead.enquiry_type.slice(1).replaceAll("_", " ")}
        </span>
      ),
    },
    children.length > 0 && {
      label: children.length > 1 ? "Children" : "Child",
      value: (
        <span className="flex flex-col font-semibold">
          {children.map((child, i) => (
            <span key={i}>{child}</span>
          ))}
        </span>
      ),
    },
  ].filter((row) => !!row);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className={sectionLabel}>Your enquiry overview</h2>
        <span className="text-sm text-white/80">Pre-populated</span>
      </div>
      <dl className={cn(card, "mt-3 px-6 py-2")}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 border-b py-3.5 last:border-0">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function NextSteps({ channel }: { channel: OtpChannel }) {
  return (
    <section>
      <h2 className={sectionLabel}>What happens next</h2>
      <ol className={cn(card, "relative mt-3 flex flex-col gap-6 p-6")}>
        <span aria-hidden className="absolute top-12 bottom-12 left-[2.625rem] w-px bg-border" />
        {[VERIFY[channel], ...NEXT_STEPS].map(({ icon: Icon, title, detail }, i) => {
          const active = i === 0;
          return (
            <li key={title} className="relative flex gap-4" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  active ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {title}
                  {active && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wider text-primary uppercase">
                      Active step
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
