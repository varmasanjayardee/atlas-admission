"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { StepContent } from "@/components/admission/steps";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useStepParam } from "@/hooks/use-step-param";
import { canOpenStep, getStepState, JOURNEY_STEPS, TOTAL_STEPS, type StepState } from "@/lib/journey";
import type { Admission } from "@/types/admission.types";

export const STATE_BADGE: Record<StepState, { label: string; variant: "default" | "secondary" | "outline" }> = {
  done: { label: "Completed", variant: "secondary" },
  current: { label: "In progress", variant: "default" },
  upcoming: { label: "Not started", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
};

/** Bottom sheet on mobile, right-hand panel on desktop; the open step comes from ?step= */
export function StepDrawer({ admission }: { admission: Admission }) {
  const { step: requested, setStep } = useStepParam();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const requestedStep = requested ? JOURNEY_STEPS[requested - 1] : undefined;
  const open = !!requestedStep && canOpenStep(getStepState(requestedStep.number, admission));

  // Keep the last step rendered while the drawer animates closed
  const [shown, setShown] = useState(requestedStep);
  if (open && requestedStep !== shown) setShown(requestedStep);

  const state = shown && getStepState(shown.number, admission);
  const goNext = () => setStep(shown && shown.number < TOTAL_STEPS ? shown.number + 1 : null);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && setStep(null)}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:32rem] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-3rem)]">
        {shown && state && (
          <>
            <header className="flex shrink-0 items-start gap-4 border-b px-6 py-5">
              <div className="min-w-0 flex-1">
                <DrawerDescription className="text-xs font-medium text-muted-foreground tabular-nums">
                  Step {String(shown.number).padStart(2, "0")} of {String(TOTAL_STEPS).padStart(2, "0")}
                </DrawerDescription>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <DrawerTitle className="text-xl font-bold tracking-tight">{shown.title}</DrawerTitle>
                  <Badge variant={STATE_BADGE[state].variant}>{STATE_BADGE[state].label}</Badge>
                </div>
              </div>
              <DrawerClose
                className="-mr-2 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </DrawerClose>
            </header>

            <StepContent key={shown.number} admission={admission} step={shown} state={state} goNext={goNext} />
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
