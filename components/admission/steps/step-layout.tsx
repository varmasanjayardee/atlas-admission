import { cn } from "@/lib/utils";
import type { JourneyStep, StepState } from "@/lib/journey";
import type { Admission } from "@/types/admission.types";

/** Props every step's drawer content receives */
export interface StepContentProps {
  admission: Admission;
  step: JourneyStep;
  state: StepState;
  /** Move the drawer to the following step (closes after the last one) */
  goNext: () => void;
  /** Shown as a full page (new journey view) rather than in the drawer */
  page?: boolean;
}

/** Scrollable middle of the drawer */
export function StepBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 space-y-8 overflow-y-auto px-6 py-6", className)} {...props} />;
}

/** Pinned bottom of the drawer for the primary action */
export function StepFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 flex-col gap-2 border-t bg-popover px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]", className)}
      {...props}
    />
  );
}

export function StepSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
