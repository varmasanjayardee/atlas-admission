"use client";

import { format, parseISO } from "date-fns";
import { CheckIcon, ExternalLinkIcon, KeyRoundIcon, LifeBuoyIcon } from "lucide-react";
import { site } from "@/lib/site";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";
import { AccountCard, type Account } from "./account-setup-step";

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Step 11: the Atlas accounts exist; show every login and send the family to sign in */
export function AccountReadyStep({ admission }: StepContentProps) {
  const child = admission.child!;
  const accounts = child.atlas_accounts;

  if (!accounts) {
    return (
      <StepBody>
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Your Atlas accounts are being created. This page updates when they&apos;re ready.</p>
      </StepBody>
    );
  }

  const cards: Account[] = [
    {
      key: "student",
      kind: "student",
      name: accounts.student.name,
      role: `Student · ${child.grade}`,
      login: accounts.student.email,
      photo: child.documents.find((d) => d.kind === "child_photo")?.url,
      ready: true,
    },
    ...accounts.guardians.map((g, i) => ({
      key: `g${i}`,
      kind: "guardian" as const,
      name: g.name,
      role: `Parent · ${capital(g.relationship)}`,
      login: g.email,
      ready: true,
    })),
  ];

  return (
    <>
      <StepBody>
        <section className="flex flex-col items-center rounded-2xl bg-navy px-6 py-8 text-center text-white">
          {/* The one celebration: the tick lands as the step opens */}
          <span className="flex size-16 items-center justify-center rounded-full bg-green-500 shadow-[0_0_0_8px_rgb(34_197_94/0.2)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.3)] starting:scale-0 motion-reduce:transition-none">
            <CheckIcon className="size-8" strokeWidth={3} />
          </span>
          <h3 className="mt-4 font-serif text-3xl italic">Atlas account created</h3>
          <p className="mt-1 text-sm text-white/75">
            Welcome to {site.school}, {child.first_name}.
            {accounts.created_at && ` Ready since ${format(parseISO(accounts.created_at), "d MMMM yyyy")}.`}
          </p>
        </section>

        <StepSection title="Your logins">
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((a) => (
              <AccountCard key={a.key} account={a} />
            ))}
          </div>
        </StepSection>

        <StepSection title="Signing in">
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              Admissions gives each person their first password. Sign in with the email on your card.
            </li>
            <li className="flex gap-3">
              <LifeBuoyIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              Lost it? Use &ldquo;Forgot password&rdquo; on the Atlas sign-in page, or email {site.helpEmail}.
            </li>
          </ul>
        </StepSection>
      </StepBody>

      <StepFooter>
        <a
          href={site.atlasUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Open Atlas
          <ExternalLinkIcon className="size-4" />
        </a>
      </StepFooter>
    </>
  );
}
