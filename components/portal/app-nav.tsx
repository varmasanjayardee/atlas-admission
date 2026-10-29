"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelpIcon, HouseIcon, LogOutIcon, MessageSquareTextIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";
import { useLogout } from "@/services/auth.service";

// ponytail: only Journey exists so far; the other routes are placeholders
const NAV_ITEMS = [
  { href: "/", label: "Journey", icon: HouseIcon },
  { href: "/chats", label: "Chats", icon: MessageSquareTextIcon },
  { href: "/help", label: "Help", icon: CircleHelpIcon },
  { href: "/profile", label: "You", icon: UserIcon },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Desktop: fixed left sidebar */
export function SideNav() {
  const isActive = useIsActive();
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-navy px-4 py-8 text-white lg:flex">
      <Link href="/" className="px-3 font-serif text-2xl italic">
        {site.school}
      </Link>
      <p className="mt-1 px-3 text-sm text-white/60">Admissions</p>

      <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-white/75 transition-colors hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:font-medium aria-[current=page]:text-white"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>

      <a
        href={`mailto:${site.helpEmail}`}
        className="mt-auto px-3 text-sm text-white/60 hover:text-white hover:underline"
      >
        {site.helpEmail}
      </a>
      <button
        type="button"
        onClick={logout}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-white/75 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        <LogOutIcon className="size-5" />
        Sign out
      </button>
    </aside>
  );
}

/** Mobile: fixed bottom tab bar */
export function BottomNav() {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-8px_oklch(0.2571_0.1161_272.24/0.18)] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground",
                "aria-[current=page]:font-medium aria-[current=page]:text-primary"
              )}
            >
              <Icon className="size-6" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
