"use client";

import { GraduationCapIcon, KeyRoundIcon, ShieldCheckIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { getInitials, maskEmail, maskPhone } from "@/lib/format";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Child } from "@/schemas/auth.schema";
import { StepBody, StepSection, type StepContentProps } from "./step-layout";

const SETUP = 10;
const READY = 11;

export interface Account {
  key: string;
  kind: "student" | "guardian";
  name: string;
  role: string;
  login: string;
  photo?: string | null;
  ready: boolean;
  primary?: boolean;
}

/** Step 10: the Atlas accounts being created, one card per student and per guardian */
export function AccountSetupStep({ admission }: StepContentProps) {
  const { lead } = admission;
  const child = admission.child!;

  // Every child in the family who's reached account setup, this one first
  const students = [child, ...lead.children.filter((c) => c.id !== child.id && c.current_step >= SETUP)];
  const ready = (c: Child) => c.current_step >= READY;
  const allReady = students.every(ready);

  const accounts: Account[] = [
    ...students.map((c) => ({
      key: `s${c.id}`,
      kind: "student" as const,
      name: `${c.first_name} ${c.last_name}`.trim(),
      role: `Student · ${c.grade}`,
      login: c.atlas_accounts?.student.email ?? "Login shared when the account is ready",
      photo: c.documents.find((d) => d.kind === "child_photo")?.url,
      ready: ready(c),
    })),
    ...lead.guardians.map((g, i) => ({
      key: `g${i}`,
      kind: "guardian" as const,
      name: g.name,
      role: `Parent · ${g.relationship.charAt(0).toUpperCase()}${g.relationship.slice(1)}`,
      login: g.email ? maskEmail(g.email) : maskPhone(g.mobile),
      ready: allReady,
      primary: g.is_primary,
    })),
  ];

  return (
    <StepBody>
      <section className="rounded-2xl bg-muted/60 p-4">
        <p className="font-semibold">{allReady ? "Your Atlas accounts are ready" : "Your Atlas accounts are being set up"}</p>
        <p className="text-sm text-muted-foreground">
          {students.length === 1 ? "One student" : `${students.length} students`} and{" "}
          {lead.guardians.length === 1 ? "one parent" : `${lead.guardians.length} parents and guardians`}. The school assigns
          {students.length === 1 ? ` ${child.first_name}'s` : " each child's"} grade and section, then the logins arrive in the next step.
        </p>
      </section>

      <StepSection title="Students">
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts
            .filter((a) => a.kind === "student")
            .map((a) => (
              <AccountCard key={a.key} account={a} />
            ))}
        </div>
      </StepSection>

      <StepSection title="Parents and guardians">
        {lead.guardians.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts
              .filter((a) => a.kind === "guardian")
              .map((a) => (
                <AccountCard key={a.key} account={a} />
              ))}
          </div>
        ) : (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            No parent or guardian is on the application. Call {site.helpLine} so an account can be made for you.
          </p>
        )}
      </StepSection>

      <StepSection title="What happens next">
        <ul className="space-y-3 text-sm">
          {[
            { icon: GraduationCapIcon, text: "The school assigns grade, section and mentor." },
            { icon: KeyRoundIcon, text: "Login details for every account arrive in the next step." },
            { icon: ShieldCheckIcon, text: "Each parent signs in with the email shown on their card." },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>
      </StepSection>
    </StepBody>
  );
}

/** An Atlas ID-style card for one account */
export function AccountCard({ account: a }: { account: Account }) {
  const Icon = a.kind === "student" ? UserRoundIcon : UsersIcon;

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-[0_10px_24px_-14px_color-mix(in_oklab,var(--navy)_45%,transparent)] ring-1 ring-foreground/5">
      <header className="flex items-center justify-between bg-navy px-4 py-2 text-white">
        <span className="font-serif text-sm italic">{site.school}</span>
        <span className="flex items-center gap-1 text-[0.7rem] text-white/70">
          <Icon className="size-3" />
          {a.kind === "student" ? "Student" : "Parent"} account
        </span>
      </header>

      <div className="flex items-center gap-3 px-4 py-4">
        {a.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned bucket URL
          <img src={a.photo} alt="" className="size-14 shrink-0 rounded-xl object-cover ring-2 ring-navy-ink/10" />
        ) : (
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-semibold",
              a.kind === "student" ? "bg-primary/10 text-primary" : "bg-navy/10 text-navy-ink"
            )}
          >
            {getInitials(a.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{a.name}</p>
          <p className="text-sm text-muted-foreground">{a.role}</p>
          {a.primary && <p className="mt-0.5 text-xs font-medium text-primary">Primary contact</p>}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-dashed px-4 py-2.5 text-xs">
        <span className="min-w-0 truncate text-muted-foreground">{a.login}</span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
            a.ready ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
          )}
        >
          <span className={cn("size-1.5 rounded-full", a.ready ? "bg-green-600" : "animate-pulse bg-amber-500 motion-reduce:animate-none")} />
          {a.ready ? "Ready" : "Being set up"}
        </span>
      </footer>
    </article>
  );
}
