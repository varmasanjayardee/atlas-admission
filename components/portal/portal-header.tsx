"use client";

import Link from "next/link";
import { ProfileSwitcher } from "@/components/portal/profile-switcher";
import { useSelectedStudent } from "@/hooks/use-selected-student";
import { site } from "@/lib/site";
import { useMe } from "@/services/auth.service";

/** Full-width top bar: wordmark, which admissions this is (year · campus), and the account menu */
export function PortalHeader() {
  const { data: lead } = useMe();
  const { student } = useSelectedStudent();
  const child = lead?.children.find((c) => String(c.id) === student?.id) ?? lead?.children[0];
  const context = ["Admissions", child?.academic_year_name].filter(Boolean).join(" ");

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/85 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
      <Link href="/" className="font-serif text-2xl leading-none text-foreground italic">
        {site.school}
        <small className="mt-1 block font-sans text-[11px] tracking-[0.1em] text-muted-foreground uppercase not-italic">Admissions</small>
      </Link>
      <p className="mx-auto hidden truncate text-sm text-muted-foreground lg:block">
        {context}
        {lead?.campus && ` · ${lead.campus}`}
      </p>
      <div className="ml-auto lg:ml-0">
        <ProfileSwitcher />
      </div>
    </header>
  );
}
