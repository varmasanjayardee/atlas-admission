import type { Child, Lead } from "@/schemas/auth.schema";

export interface Student {
  id: string;
  name: string;
  grade: string;
}

export interface Counsellor {
  name: string;
}

export interface Visit {
  /** ISO date, e.g. "2026-10-28" */
  date: string;
  /** 24h time, e.g. "10:30" */
  time: string;
  gate: string;
}

export type ReviewOutcome = Child["outcome"];

/** One child's journey, built from /admission/me/ */
export interface Admission {
  /** The child's id, or "new" before the parent adds a child */
  studentId: string;
  /** 1–11, see JOURNEY_STEPS in lib/journey.ts */
  currentStep: number;
  enquiryDate: string;
  outcome: ReviewOutcome;
  /** null until the parent adds the child in step 1 */
  child: Child | null;
  /** The parent's enquiry; holds the family sections of the application form */
  lead: Lead;
  campus: string;
  parentName: string;
  // ponytail: no visit or counsellor API yet, always null
  visit: Visit | null;
  counsellor: Counsellor | null;
}
