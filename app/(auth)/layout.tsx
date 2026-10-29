import { LockIcon } from "lucide-react";
import { SchoolPanel } from "@/components/auth/school-panel";
import { site } from "@/lib/site";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <SchoolPanel />

      <section className="flex flex-col bg-navy px-6 py-10 text-white sm:px-10 lg:px-20 lg:py-16 xl:px-24">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <p className="border-b border-maroon pb-5 text-sm font-semibold tracking-[0.25em] uppercase">
            Admissions portal
          </p>

          <div className="flex flex-1 flex-col py-10">{children}</div>

          <footer className="flex flex-col gap-2 border-t border-maroon pt-5 text-sm text-white/80 sm:flex-row sm:justify-between">
            <span className="flex items-center gap-2">
              <LockIcon className="size-4" />
              256-bit encrypted official admissions process
            </span>
            <a href={`mailto:${site.helpEmail}`} className="hover:underline">
              Help Desk: {site.helpEmail}
            </a>
          </footer>
        </div>
      </section>
    </main>
  );
}
