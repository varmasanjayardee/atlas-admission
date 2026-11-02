import { SchoolIcon } from "lucide-react";
import { site } from "@/lib/site";

// ponytail: text lockup stands in for the real logo; swap for /public/logo.svg when available
function Logo() {
  return (
    <div className="inline-flex flex-col leading-none">
      <span className="font-serif text-2xl font-medium tracking-wide text-navy-ink uppercase">
        {site.school}
      </span>
      <span className="mt-1 bg-maroon px-1.5 py-0.5 text-sm font-semibold tracking-wider text-white uppercase">
        Be the change
      </span>
    </div>
  );
}

/** Left panel of the auth screens; only the logo shows on mobile */
export function SchoolPanel() {
  return (
    <aside className="flex flex-col bg-paper px-6 py-6 sm:px-10 lg:px-16 lg:py-16">
      <Logo />

      <div className="my-auto hidden max-w-xl py-16 lg:block">
        <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-maroon uppercase">
          <span aria-hidden className="size-2.5 rounded-full bg-maroon" />
          Admissions 2027–28
        </p>
        <blockquote className="mt-8 font-serif text-5xl leading-[1.25] text-navy-ink italic">
          “Nurturing curiosity, courage, and character in equal measure.”
        </blockquote>
        <span aria-hidden className="mt-8 block h-0.5 w-20 bg-maroon" />
        <p className="mt-10 text-xl leading-loose text-navy-ink/85">
          We are delighted to accompany your family on this journey. Your child’s prospective seat at
          our New Friends Colony campus is handled with individual care, transparency, and personal
          attention.
        </p>
      </div>

      <div className="hidden items-center gap-4 border-t border-navy-ink/15 pt-6 lg:flex">
        <span className="flex size-11 items-center justify-center rounded-full bg-navy text-white">
          <SchoolIcon className="size-5" />
        </span>
        <div>
          <p className="text-navy-ink">Office of Admissions</p>
          <p className="text-sm text-maroon">{site.school}, New Delhi</p>
        </div>
      </div>
    </aside>
  );
}
