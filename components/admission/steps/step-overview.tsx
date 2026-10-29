"use client";

import { Button } from "@/components/ui/button";
import { JOURNEY_STEPS } from "@/lib/journey";
import { StepBody, StepFooter, type StepContentProps } from "./step-layout";

// ponytail: stand-in for steps without their own screen yet; register real ones in ./index.ts
export function StepOverview({ step, state, goNext }: StepContentProps) {
  const following = JOURNEY_STEPS[step.number];

  return (
    <>
      <StepBody>
        <p className="text-base leading-relaxed text-muted-foreground">{step.description}</p>
      </StepBody>
      {/* Steps complete through their own screens; a done step can only page forward */}
      {following && state === "done" && (
        <StepFooter>
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {following.title}
          </Button>
        </StepFooter>
      )}
    </>
  );
}
