import { ApplicationStep } from "./application-step";
import { AptitudeTestStep } from "./aptitude-test-step";
import { JoiningStep } from "./joining-step";
import { OfferStep } from "./offer-step";
import { AccountReadyStep } from "./account-ready-step";
import { AccountSetupStep } from "./account-setup-step";
import { FeeStep } from "./fee-step";
import { ReviewStep } from "./review-step";
import { SlotBookingStep } from "./slot-booking-step";
import { VisitDayStep } from "./visit-day-step";
import { StepOverview } from "./step-overview";
import type { StepContentProps } from "./step-layout";

/** Drawer content per journey step; add a case here as each step's screen is built */
export function StepContent(props: StepContentProps) {
  switch (props.step.number) {
    case 1:
      return <ApplicationStep {...props} />;
    case 2:
      return <FeeStep {...props} kind="registration" />;
    case 3:
      return <SlotBookingStep {...props} />;
    case 4:
      return <VisitDayStep {...props} />;
    case 5:
      return <AptitudeTestStep {...props} />;
    case 6:
      return <ReviewStep {...props} />;
    case 7:
      return <OfferStep {...props} />;
    case 8:
      return <FeeStep {...props} kind="admission" />;
    case 9:
      return <JoiningStep {...props} />;
    case 10:
      return <AccountSetupStep {...props} />;
    case 11:
      return <AccountReadyStep {...props} />;
    default:
      return <StepOverview {...props} />;
  }
}

export type { StepContentProps };
