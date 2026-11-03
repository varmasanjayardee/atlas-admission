import type { LucideIcon } from "lucide-react";
import {
  BadgeCheckIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  HourglassIcon,
  KeyRoundIcon,
  MapPinIcon,
  UserCogIcon,
  WalletIcon,
} from "lucide-react";
import type { Admission } from "@/types/admission.types";

export interface JourneyStep {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  /** What the parent should do while this is the current step */
  action: { title: string; cta: string };
  /** What happens at this step, shown when its card is open in the journey list */
  details: string[];
  /** What the family should have ready: the Help page's checklist, opened from each step's "What I'll need" */
  needs: string[];
}

export const JOURNEY_PARTS = [
  { label: "Visit", steps: [1, 2, 3, 4] },
  { label: "Offer", steps: [5, 6, 7] },
  { label: "Joining", steps: [8, 9, 10] },
] as const;

// Same numbering as AdmissionStep in keyed-backend admission/models.py
export const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    title: "Application form",
    description: "Add your child's details. Applying for more than one child? Add each of them",
    icon: FileTextIcon,
    action: { title: "Finish your application form", cta: "Continue" },
    details: ["Your child's details, your family's details, home address and emergency contacts.", "Documents as photographs or PDF files, up to 10 MB each.", "Saved as you go, so you can stop and come back any time.", "Submit once every required answer is in."],
    needs: ["A recent photograph of your child", "Birth certificate", "Date of birth proof: passport or Aadhaar", "Photographs of the parents", "Address proof", "Your child's last report card, if they are at school now", "Details of each parent and of two emergency contacts"],
  },
  {
    number: 2,
    title: "Registration fee",
    description: "Pay the registration fee set by your admission counsellor",
    icon: WalletIcon,
    action: { title: "Pay the registration fee", cta: "Pay" },
    details: ["The amount comes from the fee plan for your campus, academic year and grade.", "Pay online on ICICI Bank's secure page.", "This step completes as soon as the payment clears."],
    needs: ["UPI, a debit or credit card, or net banking", "Your phone, for the bank's one-time password"],
  },
  {
    number: 3,
    title: "Slot booking",
    description: "Pick a visit slot with an admission counsellor and get your gate pass",
    icon: CalendarClockIcon,
    action: { title: "Book your campus visit", cta: "Book" },
    details: ["Pick a visit slot on your campus.", "Your gate pass is issued as soon as you book. You can reschedule or cancel here."],
    needs: ["A few dates that suit your family"],
  },
  {
    number: 4,
    title: "Visit day",
    description: "Show your gate pass at the gate on the day",
    icon: MapPinIcon,
    action: { title: "Get ready for visit day", cta: "Gate pass" },
    details: ["Show your gate pass at the gate.", "The admissions team checks you in and meets you on campus."],
    needs: ["Your gate pass, on your phone or printed", "Arrive a few minutes before your slot"],
  },
  {
    number: 5,
    title: "Under review",
    description: "The admissions team reviews the visit and shares the outcome",
    icon: HourglassIcon,
    action: { title: "Your application is under review", cta: "Status" },
    details: ["Nothing is needed from you at this step.", "The admissions team reviews your application and your visit.", "You will see the outcome here."],
    needs: ["Nothing. We will let you know here."],
  },
  {
    number: 6,
    title: "Accept offer",
    description: "Accept within 7 days, with one 7-day extension if you need it",
    icon: BadgeCheckIcon,
    action: { title: "You have an offer", cta: "View offer" },
    details: ["Read your offer and its fees.", "Accept within 7 days, or ask once for 7 more days.", "If you decide not to join, you can decline here."],
    needs: ["Time to read the offer and its fees"],
  },
  {
    number: 7,
    title: "Admission fee",
    description: "Pay the admission fee and download your invoice",
    icon: CreditCardIcon,
    action: { title: "Pay the admission fee", cta: "Pay" },
    details: ["The amount comes from your admission fee plan.", "Pay online on ICICI Bank's secure page.", "Your place is confirmed once the payment clears."],
    needs: ["UPI, a debit or credit card, or net banking", "Your phone, for the bank's one-time password"],
  },
  {
    number: 8,
    title: "Joining form",
    description: "Upload the last documents and confirm a few things; admissions confirms the joining date",
    icon: ClipboardListIcon,
    action: { title: "Get ready for day one", cta: "Checklist" },
    details: ["Upload the last documents and confirm a few things.", "Admissions confirms your child's joining date."],
    needs: ["The transfer certificate from your child's current school, if they have one", "Anything admissions adds to your checklist"],
  },
  {
    number: 9,
    title: "Atlas account setup",
    description: "The school assigns your child's grade and section",
    icon: UserCogIcon,
    action: { title: "Your Atlas account is being set up", cta: "Details" },
    details: ["The school sets up Atlas accounts for your child and your family.", "Nothing is needed from you at this step."],
    needs: ["Nothing. The school sets this up."],
  },
  {
    number: 10,
    title: "Atlas account ready",
    description: "Login details for parent and student",
    icon: KeyRoundIcon,
    action: { title: "Your Atlas account is ready", cta: "View logins" },
    details: ["Login details for you and your child.", "Sign in to Atlas, the school's app."],
    needs: ["A phone or computer to sign in to Atlas"],
  },
];

export const TOTAL_STEPS = JOURNEY_STEPS.length;

/** The review (or an unanswered offer) closed the journey */
export const isEnded = (admission: Admission) =>
  (["rejected", "not_offered", "declined", "withdrawn"] as const).some((o) => o === admission.outcome);

const ENDED_TITLE = {
  rejected: "This application wasn't successful",
  not_offered: "This application was not offered a place",
  declined: "You declined this offer",
  withdrawn: "This offer expired",
};

/** The headline when the journey has closed, else undefined */
export const endedTitle = (admission: Admission): string | undefined => ENDED_TITLE[admission.outcome as keyof typeof ENDED_TITLE];

export type StepState = "done" | "current" | "upcoming" | "closed";

export function getStepState(step: number, admission: Admission): StepState {
  // Not offered or withdrawn: the journey stops where it is and later steps never open
  const ended = isEnded(admission);
  if (ended && step >= admission.currentStep) return "closed";
  if (step < admission.currentStep) return "done";
  if (step === admission.currentStep) return "current";
  return "upcoming";
}

/** Done and current steps can be opened; upcoming and closed ones are locked */
export const canOpenStep = (state: StepState) => state === "done" || state === "current";

export function getCurrentStep(admission: Admission) {
  return JOURNEY_STEPS[Math.min(Math.max(admission.currentStep, 1), TOTAL_STEPS) - 1];
}
