import { format, parseISO } from "date-fns";
import { MailIcon } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/format";
import { site } from "@/lib/site";
import { useChildFees } from "@/services/admission.service";
import type { Counsellor, Visit } from "@/types/admission.types";

const card = "flex flex-col rounded-2xl bg-card p-4 ring-1 ring-foreground/5";
const label = "text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase";

export function VisitCard({ visit }: { visit: Visit | null }) {
  return (
    <section className={card}>
      <h3 className={label}>Visit</h3>
      {visit ? (
        <>
          <p className="mt-auto pt-6 text-3xl font-bold tracking-tight">{format(parseISO(visit.date), "d MMM")}</p>
          <p className="text-sm text-muted-foreground">
            {visit.time} · {visit.gate}
          </p>
        </>
      ) : (
        <p className="mt-auto pt-6 text-sm text-muted-foreground">Not booked yet</p>
      )}
    </section>
  );
}

export function CounsellorCard({ counsellor }: { counsellor: Counsellor | null }) {
  if (!counsellor) {
    return (
      <section className={card}>
        <h3 className={label}>Your counsellor</h3>
        <p className="mt-auto pt-6 text-sm text-muted-foreground">Assigned after your application</p>
      </section>
    );
  }

  const [first, ...rest] = counsellor.name.split(" ");

  return (
    <section className={card}>
      <h3 className={label}>Your counsellor</h3>
      <span className="mt-3 flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
        {getInitials(counsellor.name)}
      </span>
      <p className="mt-2 text-xl font-bold tracking-tight">{first}</p>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        {rest.join(" ")}
        <a href={`mailto:${site.helpEmail}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          <MailIcon className="size-3.5" />
          Email
        </a>
      </p>
    </section>
  );
}

/** The registration fee from the child's fee plan, once there is a child and a plan */
export function FeeCard({ childId }: { childId: number | undefined }) {
  const fees = useChildFees(childId);
  const total = fees.data?.registration.total;

  return (
    <section className={card}>
      <h3 className={label}>Registration fee</h3>
      {total && Number(total) ? (
        <>
          <p className="mt-auto pt-6 text-3xl font-bold tracking-tight tabular-nums">{formatCurrency(total)}</p>
          <p className="text-sm text-muted-foreground">Paid once, at step 2</p>
        </>
      ) : (
        <p className="mt-auto pt-6 text-sm text-muted-foreground">Shown once your campus, year and grade are chosen</p>
      )}
    </section>
  );
}
