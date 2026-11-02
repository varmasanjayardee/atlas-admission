"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { CheckIcon, ChevronRightIcon, LogOutIcon, MailIcon, MapPinIcon, PhoneIcon, PlusIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIdentifier, getInitials } from "@/lib/format";
import { JOURNEY_STEPS, TOTAL_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Lead } from "@/schemas/auth.schema";
import { useSaveFamily } from "@/services/admission.service";
import { useLogout, useMe } from "@/services/auth.service";
import { useProfileStore } from "@/store/profile.store";

const card = "rounded-2xl bg-card p-5 ring-1 ring-foreground/5 sm:p-6";
const label = "text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase";
const row = "flex items-center gap-4 border-t py-4 first:border-t-0";

const PREFERENCES = [
  { key: "notify_whatsapp", title: "WhatsApp", detail: "Visit reminders and your gate pass" },
  { key: "notify_email", title: "Email", detail: "Receipts, your offer letter and account details" },
  { key: "notify_sms", title: "Text message (SMS)", detail: "Reminders by text" },
] as const;

/** "You": the parent's details, their children, how we reach them, and sign out */
export function ProfileScreen() {
  const { data: lead } = useMe();
  const logout = useLogout();

  if (!lead) return <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-2xl bg-muted" aria-busy />;

  const name = `${lead.first_name} ${lead.last_name}`.trim();
  const years = [...new Set(lead.children.map((c) => c.academic_year_name).filter(Boolean))].join(", ");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">You</h1>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className={card}>
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">{getInitials(name)}</span>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold tracking-tight">{name}</p>
              <p className="text-sm text-muted-foreground">Parent · Enquiry made on {format(parseISO(lead.created_at), "d MMMM yyyy")}</p>
            </div>
          </div>

          <ul className="mt-4">
            <li className={row}>
              <PhoneIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium tabular-nums">{formatIdentifier(lead.phone_number)}</p>
                <p className="text-sm text-muted-foreground">Mobile</p>
              </div>
              {lead.otp_channel === "sms" && <Verified />}
            </li>
            <li className={row}>
              <MailIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{lead.email}</p>
                <p className="text-sm text-muted-foreground">Email</p>
              </div>
              {lead.otp_channel === "email" && <Verified />}
            </li>
            {lead.campus && (
              <li className={row}>
                <MapPinIcon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{lead.campus}</p>
                  <p className="text-sm text-muted-foreground">Campus{years && ` · ${years}`}</p>
                </div>
              </li>
            )}
          </ul>
          {/* The mobile and email are how the family signs in, so admissions changes them */}
          <p className="mt-2 text-sm text-muted-foreground">
            To change your mobile or email,{" "}
            <a href={`mailto:${site.helpEmail}?subject=${encodeURIComponent("Change my contact details")}`} className="font-medium text-primary hover:underline">
              write to admissions
            </a>
            .
          </p>
        </section>

        <div className="flex flex-col gap-4">
          <Children lead={lead} />
          <Preferences lead={lead} />
          <JourneyView />
          <Appearance />

          <section className={cn(card, "py-1 sm:py-1")}>
            <ul>
              <li>
                <a
                  href={`mailto:${site.helpEmail}?subject=${encodeURIComponent("My application data")}`}
                  className={cn(row, "-mx-2 rounded-lg px-2 hover:bg-muted/50")}
                >
                  <ShieldCheckIcon className="size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Privacy and your data</span>
                    <span className="block text-sm text-muted-foreground">Ask for a copy of your application, or for it to be deleted</span>
                  </span>
                  <ChevronRightIcon className="size-5 text-muted-foreground/60" />
                </a>
              </li>
              <li className={row}>
                <LogOutIcon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Sign out</p>
                  <p className="text-sm text-muted-foreground">Sign back in with the link in your enquiry email</p>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  Sign out
                </Button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Verified() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
      <CheckIcon className="size-3.5" />
      Verified
    </span>
  );
}

function Children({ lead }: { lead: Lead }) {
  const router = useRouter();
  const selectStudent = useProfileStore((s) => s.selectStudent);
  const open = (id: number) => {
    selectStudent(String(id));
    router.push("/");
  };

  return (
    <section className={card}>
      <h2 className={label}>Children on this enquiry</h2>
      <ul className="mt-2">
        {lead.children.map((c) => (
          <li key={c.id} className={row}>
            <UserIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{`${c.first_name} ${c.last_name}`.trim()}</p>
              <p className="text-sm text-muted-foreground">
                {[c.grade, `Step ${Math.min(c.current_step, TOTAL_STEPS)} of ${TOTAL_STEPS}: ${JOURNEY_STEPS[Math.min(c.current_step, TOTAL_STEPS) - 1].title}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => open(c.id)}>
              Open
            </Button>
          </li>
        ))}
        <li className={row}>
          <PlusIcon className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{lead.children.length ? "Applying for another child?" : "No child added yet"}</p>
            <p className="text-sm text-muted-foreground">Add them in the application form</p>
          </div>
          <Button size="sm" render={<Link href="/?step=1" />} nativeButton={false}>
            Add a child
          </Button>
        </li>
      </ul>
    </section>
  );
}

function Preferences({ lead }: { lead: Lead }) {
  const save = useSaveFamily();

  return (
    <section className={card}>
      <h2 className={label}>How we reach you</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign-in codes are always sent, whatever you choose here.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {PREFERENCES.map((p) => {
          // While saving, show the new value
          const on = save.isPending && save.variables && p.key in save.variables ? !!save.variables[p.key] : lead[p.key];
          return (
            <li key={p.key} className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <span>
                <span className="block font-medium">{p.title}</span>
                <span className="block text-sm text-muted-foreground">{p.detail}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={p.title}
                disabled={save.isPending}
                onClick={() => save.mutate({ [p.key]: !on }, { onError: (e) => toast.error(e.message) })}
                className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/25 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 aria-checked:bg-green-600"
              >
                <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Light, dark (Material's dark theme) or follow the device */
function Appearance() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", title: "Light" },
    { value: "dark", title: "Dark" },
    { value: "system", title: "Device" },
  ];

  return (
    <section className={card}>
      <h2 className={label}>Appearance</h2>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Appearance">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            // theme is undefined until mounted on the client; nothing shows as picked until then
            aria-checked={theme === o.value}
            onClick={() => setTheme(o.value)}
            className="rounded-xl border px-4 py-3 text-center font-medium transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5"
          >
            {o.title}
          </button>
        ))}
      </div>
    </section>
  );
}

/** The new step list or the classic journey map */
function JourneyView() {
  const { journeyView, setJourneyView } = useProfileStore();
  const views = [
    { value: "new", title: "Step list", detail: "Where you are, then every step as a card" },
    { value: "classic", title: "Journey map", detail: "The winding route through the steps" },
  ] as const;

  return (
    <section className={card}>
      <h2 className={label}>Journey view</h2>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Journey view">
        {views.map((v) => (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={journeyView === v.value}
            onClick={() => setJourneyView(v.value)}
            className="rounded-xl border px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5"
          >
            <span className="block font-medium">{v.title}</span>
            <span className="block text-sm text-muted-foreground">{v.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
