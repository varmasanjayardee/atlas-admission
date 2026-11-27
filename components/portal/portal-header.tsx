"use client";

import Image from "next/image";
import Link from "next/link";
import { ProfileSwitcher } from "@/components/portal/profile-switcher";
import { useSelectedStudent } from "@/hooks/use-selected-student";
import { site } from "@/lib/site";
import { useMe } from "@/services/auth.service";

/** Full-width top bar: the school logo, which admissions this is (year · campus), and the account menu */
export function PortalHeader() {
  const { data: lead } = useMe();
  const { student } = useSelectedStudent();
  const child = lead?.children.find((c) => String(c.id) === student?.id) ?? lead?.children[0];
  const context = ["Admissions", child?.academic_year_name].filter(Boolean).join(" ");

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/85 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
      <Link href="/" aria-label={`${site.school} Admissions, home`} className="flex shrink-0 items-center gap-3">
        {/* Navy and red brand colours: on a white plate in dark mode so they stay readable */}
        <span className="flex items-center dark:rounded-md dark:bg-white dark:px-2 dark:py-1">
          {/* SVG: served as is (next/image only optimises raster images) */}
          <Image src="/logo.svg" alt={site.school} width={200} height={41} priority unoptimized className="h-8 w-auto" />
        </span>
        {/* <span className="hidden border-l pl-3 text-[11px] tracking-[0.1em] text-muted-foreground uppercase sm:block">Admissions</span> */}
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
