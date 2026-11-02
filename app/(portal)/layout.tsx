import { BottomNav, SideNav } from "@/components/portal/app-nav";
import { PortalHeader } from "@/components/portal/portal-header";

export default function PortalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-background">
      <PortalHeader />
      <SideNav />

      <div className="lg:pl-64">
        {/* bottom padding clears the mobile tab bar */}
        <main className="px-4 pt-6 pb-28 sm:px-8 lg:px-12 lg:pt-8 lg:pb-12">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
