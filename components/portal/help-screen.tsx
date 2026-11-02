"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { CheckIcon, MailIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";

const card = "rounded-2xl bg-card ring-1 ring-foreground/5";

const GENERAL = [
  {
    q: "I am applying for more than one child.",
    a: "Add each child in the application form. Your address, parents and emergency contacts are entered once and shared by all your children.",
  },
  {
    q: "Can I change my visit slot?",
    a: "Yes. Open the slot booking step to reschedule or cancel, then book again.",
  },
  {
    q: "I can't sign in.",
    a: "Use the link in your enquiry email, or choose \"Already have an account?\" on the sign-in page and enter the email or mobile number on your enquiry.",
  },
];

/** Help: what each step needs (the journey's "What I'll need" lands on #step-N, opened), then how to reach admissions */
export function HelpScreen() {
  // Open and scroll to the step a "What I'll need" button pointed at
  useEffect(() => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1));
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
      target.scrollIntoView({ block: "start" });
    }
  }, []);

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copied"));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Help</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="needs-heading">
            <h2 id="needs-heading" className="mb-3 font-semibold">
              What you&apos;ll need, step by step
            </h2>
            <div className="flex flex-col gap-2.5">
              {JOURNEY_STEPS.map((step) => (
                <Question key={step.number} id={`step-${step.number}`} title={`Step ${step.number}: ${step.title}`}>
                  <ul className="flex flex-col gap-1.5">
                    {step.needs.map((n) => (
                      <li key={n} className="flex gap-2.5">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </Question>
              ))}
            </div>
          </section>

          <section aria-labelledby="general-heading">
            <h2 id="general-heading" className="mb-3 font-semibold">
              Other questions
            </h2>
            <div className="flex flex-col gap-2.5">
              {GENERAL.map(({ q, a }) => (
                <Question key={q} title={q}>
                  {a}
                </Question>
              ))}
            </div>
          </section>
        </div>

        <aside className={`${card} p-5 sm:p-6 lg:sticky lg:top-24`}>
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">Office of Admissions</p>
          <h2 className="mt-1.5 text-xl font-semibold">We are here to help</h2>
          <ul className="mt-3">
            <li className="flex items-center gap-4 border-t py-4 first:border-t-0">
              <MailIcon className="size-5 shrink-0 text-muted-foreground" />
              <a href={`mailto:${site.helpEmail}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium hover:underline">{site.helpEmail}</span>
                <span className="block text-sm text-muted-foreground">Email</span>
              </a>
              <button
                type="button"
                onClick={() => copy(site.helpEmail)}
                className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                Copy
              </button>
            </li>
            <li className="flex items-center gap-4 border-t py-4">
              <ShieldCheckIcon className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Private to admissions</span>
                <span className="block text-sm text-muted-foreground">Your application is seen only by the school&apos;s admissions team.</span>
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Question({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className={`${card} group scroll-mt-24 px-5`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <PlusIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}
