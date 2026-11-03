"use client";

import { format, parseISO } from "date-fns";
import { CalendarPlusIcon, ClockIcon, HourglassIcon, MapPinIcon, PencilLineIcon, UserIcon, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNEY_STEPS } from "@/lib/journey";
import { site } from "@/lib/site";
import { StepBody, StepFooter, StepSection, type StepContentProps } from "./step-layout";
import { calendarUrl, Rows } from "./visit-day-step";

// ponytail: the counsellor doesn't give a length; an hour holds the calendar slot
const TEST_MINUTES = 60;

/** Step 5: the aptitude test the counsellor schedules and marks taken; nothing for the family to do */
export function AptitudeTestStep({ admission, state, goNext }: StepContentProps) {
  const child = admission.child!;
  const at = child.aptitude_test_at ? parseISO(child.aptitude_test_at) : null;
  const online = child.aptitude_test_mode === "online";
  const takenAt = child.steps.find((s) => s.step === 5)?.completed_at;

  return (
    <>
      <StepBody>
        {state === "done" ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
            {child.first_name} took the aptitude test{takenAt && ` on ${format(parseISO(takenAt), "d MMMM yyyy")}`}.
          </p>
        ) : !at ? (
          <p className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <HourglassIcon className="mt-0.5 size-4 shrink-0" />
            Your admission counsellor will set a date and time for {child.first_name}&apos;s aptitude test, at the school or on a video call. It
            appears here once it&apos;s set.
          </p>
        ) : null}

        {at && (
          <StepSection title={state === "done" ? "The test" : "Your child's test"}>
            <Rows
              rows={[
                { icon: ClockIcon, title: format(at, "EEEE d MMMM yyyy"), detail: `At ${format(at, "h:mm a")}` },
                online
                  ? {
                      icon: VideoIcon,
                      title: "Online, on a video call",
                      detail: child.aptitude_test_link ? "Join from a laptop or tablet a few minutes early" : "Your counsellor will share the link before the test",
                      action: child.aptitude_test_link && state !== "done" && (
                        <a href={child.aptitude_test_link} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-primary hover:underline">
                          Join
                        </a>
                      ),
                    }
                  : { icon: MapPinIcon, title: `At the school${admission.campus ? `, ${admission.campus}` : ""}`, detail: "Come to the admissions office 10 minutes early" },
                { icon: UserIcon, title: "Your admission counsellor gives the test", detail: "There's nothing to prepare or upload" },
                { icon: PencilLineIcon, title: "Afterwards, the counsellor marks it taken", detail: "The application then moves to review" },
              ]}
            />
          </StepSection>
        )}

        {at && state !== "done" && (
          <a
            href={calendarUrl(`Aptitude test · ${site.school}`, at, TEST_MINUTES, online ? (child.aptitude_test_link ?? "Video call") : admission.campus)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted"
          >
            <CalendarPlusIcon className="size-4" />
            Add to calendar
          </a>
        )}
      </StepBody>

      {state === "done" && (
        <StepFooter>
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {JOURNEY_STEPS[5].title}
          </Button>
        </StepFooter>
      )}
    </>
  );
}
