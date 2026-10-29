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
  },
  {
    number: 2,
    title: "Registration fee",
    description: "Pay the registration fee set by your admission counsellor",
    icon: WalletIcon,
    action: { title: "Pay the registration fee", cta: "Pay" },
  },
  {
    number: 3,
    title: "Slot booking",
    description: "Tell us if headphones are needed, pick a visit slot and get your gate pass",
    icon: CalendarClockIcon,
    action: { title: "Book your campus visit", cta: "Book" },
  },
  {
    number: 4,
    title: "Visit day",
    description: "Show your gate pass at the gate on the day",
    icon: MapPinIcon,
    action: { title: "Get ready for visit day", cta: "Gate pass" },
  },
  {
    number: 5,
    title: "Under review",
    description: "The admissions team reviews the visit and shares the outcome",
    icon: HourglassIcon,
    action: { title: "Your application is under review", cta: "Status" },
  },
  {
    number: 6,
    title: "Accept offer",
    description: "Accept within 7 days, with one 7-day extension if you need it",
    icon: BadgeCheckIcon,
    action: { title: "You have an offer", cta: "View offer" },
  },
  {
    number: 7,
    title: "Admission fee",
    description: "Pay the admission fee and download your invoice",
    icon: CreditCardIcon,
    action: { title: "Pay the admission fee", cta: "Pay" },
  },
  {
    number: 8,
    title: "Joining form",
    description: "Upload the last documents and confirm a few things; admissions confirms the joining date",
    icon: ClipboardListIcon,
    action: { title: "Get ready for day one", cta: "Checklist" },
  },
  {
    number: 9,
    title: "Atlas account setup",
    description: "The school assigns your child's grade and section",
    icon: UserCogIcon,
    action: { title: "Your Atlas account is being set up", cta: "Details" },
  },
  {
    number: 10,
    title: "Atlas account ready",
    description: "Login details for parent and student",
    icon: KeyRoundIcon,
    action: { title: "Your Atlas account is ready", cta: "View logins" },
  },
];

export const TOTAL_STEPS = JOURNEY_STEPS.length;

/** The review (or an unanswered offer) closed the journey */
export const isEnded = (admission: Admission) =>
  (["rejected", "not_offered", "declined", "withdrawn"] as const).some((o) => o === admission.outcome);

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
