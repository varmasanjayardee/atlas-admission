import Link from "next/link";
import { BottomNav, SideNav } from "@/components/portal/app-nav";
import { ProfileSwitcher } from "@/components/portal/profile-switcher";
import { site } from "@/lib/site";

export default function PortalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-background">
      <SideNav />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-background/85 px-4 py-3 backdrop-blur sm:px-8 lg:px-12 lg:py-6">
          <Link href="/" className="font-serif text-xl text-navy italic lg:hidden">
            {site.school}
          </Link>
          <p className="hidden text-sm text-muted-foreground lg:block">Admissions 2027–28</p>
          <ProfileSwitcher />
        </header>

        {/* bottom padding clears the mobile tab bar */}
        <main className="px-4 pt-2 pb-28 sm:px-8 lg:px-12 lg:pb-12">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
