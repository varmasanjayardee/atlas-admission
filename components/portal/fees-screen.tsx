"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addMonths, format, parseISO } from "date-fns";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CircleHelpIcon, DownloadIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { FeeReference } from "@/schemas/auth.schema";
import { useFeeReference } from "@/services/admission.service";

type Campus = FeeReference[number];
type Plan = Campus["plans"][number];
type Item = Plan["items"][number];

const EVERY = { annual: "Every year", term: "Every term", monthly: "Every month", one_time: "" } as const;

// "Ardee Montessori House, Munirka" → title "Munirka", school "Ardee Montessori House"
const split = (name: string) => {
  const [school, ...place] = name.split(",");
  return { title: place.join(",").trim() || school.trim(), school: place.length ? school.trim() : "" };
};

const gradeRange = (campus: Campus) =>
  campus.grades.length > 1 ? `${campus.grades[0].value} to ${campus.grades[campus.grades.length - 1].value}` : (campus.grades[0]?.value ?? "");

// The year's terms, split evenly from the academic year's dates
function terms(plan: Plan) {
  const from = parseISO(plan.year_from);
  const months = Math.max(1, Math.round((parseISO(plan.year_to).getTime() - from.getTime()) / (30.44 * 86_400_000)));
  const per = Math.max(1, Math.round(months / plan.terms_per_year));
  return Array.from({ length: plan.terms_per_year }, (_, i) => {
    const start = addMonths(from, i * per);
    const end = addMonths(start, per - 1);
    return `${format(start, "MMMM")} – ${format(end, "MMMM yyyy")}`;
  });
}

/** Fees: every campus's published admission fees. Phones go list → campus; a wide page shows both side by side. */
export function FeesScreen() {
  const { data, isLoading, isError } = useFeeReference();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const set = (next: Record<string, string | null>, push = false) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const url = `${pathname}?${q}`;
    if (push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
  };

  const campuses = data ?? [];
  // Academic years by name: each campus has its own rows for the same year
  const yearNames = [...new Set(campuses.flatMap((c) => c.academic_years.map((y) => y.name)))].sort();
  const withPlans = yearNames.filter((n) => campuses.some((c) => c.plans.some((p) => c.academic_years.find((y) => y.id === p.academic_year)?.name === n)));
  const year = params.get("year") ?? withPlans.at(-1) ?? yearNames.at(-1) ?? "";
  const campus = campuses.find((c) => String(c.id) === params.get("campus"));

  if (isLoading) return <div className="mx-auto h-[32rem] max-w-6xl animate-pulse rounded-2xl bg-muted" aria-busy />;
  if (isError) return <p className="mx-auto max-w-6xl rounded-2xl bg-muted p-6 text-muted-foreground">Fees couldn&apos;t be loaded. Please try again.</p>;

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10">
      {/* Campus list: the whole page on phones until a campus is picked; always beside the detail on a wide page */}
      <section className={cn("space-y-6 lg:sticky lg:top-24", campus && "max-lg:hidden")}>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-navy-ink">Fees</h1>
          <p className="mt-2 text-muted-foreground">Explore fees and payment schedules across our schools.</p>
        </div>

        {yearNames.length > 0 && (
          <Picker label="Academic year" value={year} options={yearNames.map((n) => ({ value: n, label: n.replace("-", "–") }))} onChange={(v) => set({ year: v })} />
        )}

        <div>
          <h2 className="text-xl font-bold text-navy-ink">Select a campus</h2>
          <ul className="mt-4 space-y-3">
            {campuses.map((c) => {
              const { title, school } = split(c.name);
              const active = c.id === campus?.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => set({ campus: String(c.id), grade: null }, true)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      active && "border-primary bg-primary/5"
                    )}
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted font-serif text-xl text-navy-ink">{title.charAt(0)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold">{title}</span>
                      {school && <span className="block text-sm text-muted-foreground">{school}</span>}
                      <span className="block text-xs text-muted-foreground">{gradeRange(c)}</span>
                    </span>
                    <ChevronRightIcon className="size-5 shrink-0 text-navy-ink" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <a
          href={`tel:${site.helpLine}`}
          className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <CircleHelpIcon className="size-6 shrink-0 text-navy-ink" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Need help understanding fees?</span>
            <span className="block text-sm text-muted-foreground">Call admissions on {site.helpLine}.</span>
          </span>
          <ChevronRightIcon className="size-5 shrink-0 text-navy-ink" />
        </a>
      </section>

      {campus ? (
        <CampusFees campus={campus} year={year} grade={params.get("grade")} tab={params.get("tab")} set={set} />
      ) : (
        <div className="hidden rounded-2xl border border-dashed p-10 text-center text-muted-foreground lg:block">Select a campus to see its fees.</div>
      )}
    </div>
  );
}

function CampusFees({
  campus,
  year,
  grade,
  tab,
  set,
}: {
  campus: Campus;
  year: string;
  grade: string | null;
  tab: string | null;
  set: (next: Record<string, string | null>, push?: boolean) => void;
}) {
  const { title, school } = split(campus.name);
  const yearIds = new Set(campus.academic_years.filter((y) => y.name === year).map((y) => y.id));
  const plans = campus.plans.filter((p) => yearIds.has(p.academic_year));
  const general = plans.find((p) => p.grade === "");
  // Year groups with a plan of their own, or every grade when one plan covers them all
  const grades = campus.grades.filter((g) => general || plans.some((p) => p.grade === g.value));
  const picked = grades.find((g) => g.value === grade) ?? grades[0];
  const plan = plans.find((p) => p.grade === picked?.value) ?? general;
  const schedule = tab === "schedule";

  const required = (plan?.items ?? []).filter((i) => !i.is_optional);
  const atAdmission = required.filter((i) => i.frequency === "one_time");
  const recurring = required.filter((i) => i.frequency !== "one_time");
  const optional = (plan?.items ?? []).filter((i) => i.is_optional);

  return (
    <section className="min-w-0 space-y-6">
      <div>
        <Link href="/fees" className="-ml-1 inline-flex items-center gap-0.5 px-1 py-1 text-sm font-medium text-navy-ink hover:underline lg:hidden">
          <ChevronLeftIcon className="size-4" />
          All campuses
        </Link>
        <h2 className="mt-1 text-4xl font-bold tracking-tight text-navy-ink">{title}</h2>
        <p className="mt-1 text-muted-foreground">
          {[school, `Academic year ${year.replace("-", "–")}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      {!plan ? (
        <p className="rounded-2xl bg-muted p-6 text-muted-foreground">
          Fees for {title} in {year.replace("-", "–")} aren&apos;t published yet. Call admissions on {site.helpLine}.
        </p>
      ) : (
        <>
          {grades.length > 0 && (
            <Picker label="Year group" value={picked.value} options={grades.map((g) => ({ value: g.value, label: g.label }))} onChange={(v) => set({ grade: v })} />
          )}

          <div role="tablist" aria-label="Fees view" className="grid grid-cols-2 gap-2">
            {[
              ["structure", "Fee structure"],
              ["schedule", "Payment schedule"],
            ].map(([value, label]) => {
              const on = (value === "schedule") === schedule;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => set({ tab: value === "schedule" ? "schedule" : null })}
                  className={cn(
                    "h-12 rounded-xl border text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on ? "border-transparent bg-primary/10 font-bold text-navy-ink" : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {schedule ? (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-navy-ink">Terms in {year.replace("-", "–")}</h3>
              <ol className="divide-y border-b">
                {terms(plan).map((period, i) => (
                  <li key={period} className="flex items-center gap-4 py-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-navy-ink tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block font-bold">Term {i + 1}</span>
                      <span className="block text-sm text-muted-foreground">{period}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
                {plan.terms_per_year} terms a year. Due dates and exceptions are in the official fee schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="rounded-2xl border bg-muted p-5 sm:p-6">
                <p className="text-xs tracking-wider text-muted-foreground uppercase">Payable at admission</p>
                <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{formatCurrency(plan.total)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The admission fee for {picked?.label ?? "this year group"}, paid at step 8. Optional extras are not included.
                </p>
              </div>
              <Lines title="At admission" items={atAdmission} />
              <Lines title="Recurring fees" items={recurring} />
              <Lines title="Optional" items={optional} />
            </div>
          )}

          {campus.fee_policy_url && (
            <a
              href={campus.fee_policy_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border bg-muted p-5 transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <DownloadIcon className="size-6 shrink-0 text-navy-ink" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Official fee schedule</span>
                <span className="block text-sm text-muted-foreground">Full campus fee schedule and policies · PDF</span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-navy-ink" />
            </a>
          )}
          <p className="text-sm text-muted-foreground">All amounts in INR.</p>
        </>
      )}
    </section>
  );
}

function Lines({ title, items }: { title: string; items: Item[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xl font-bold text-navy-ink">{title}</h3>
      <dl className="mt-2 divide-y border-b">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 py-4">
            <dt>
              {item.label}
              {EVERY[item.frequency] && <span className="block text-sm text-muted-foreground">{EVERY[item.frequency]}</span>}
            </dt>
            <dd className="font-bold whitespace-nowrap tabular-nums">
              {formatCurrency(item.amount)}
              {item.frequency === "monthly" && <span className="font-normal text-muted-foreground">/mo</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A labelled native select that reads like a row: "Academic year      2027–2028 ⌄" */
function Picker({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="relative flex h-14 items-center justify-between gap-4 rounded-2xl border bg-muted px-5 focus-within:ring-3 focus-within:ring-ring/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 font-bold text-navy-ink">
        {options.find((o) => o.value === value)?.label ?? value}
        <ChevronDownIcon className="size-4" />
      </span>
      {/* The real control, invisible over the row, so phones get their native picker */}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
