import { z } from "zod";

// Same rule as the backend (keyed-backend PHONE regex); it strips spaces/()/- on save
export const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number");

export const otpSchema = z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code");

export const enquiryFormSchema = {
  phone_number: phoneSchema,
  first_name: z.string().trim().min(1, "Enter your first name").max(100),
  last_name: z.string().trim().max(100),
  email: z.email("Enter a valid email address"),
};

export type EnquiryFormInput = { [K in keyof typeof enquiryFormSchema]: string };

const text = z.string();
const strings = z.array(z.string());

export const documentSchema = z.object({
  kind: z.string(),
  original_name: z.string(),
  /** Presigned, expires after an hour */
  url: z.string().nullable(),
  /** reupload_requested: admissions asked for a new copy, see reupload_note */
  status: z.enum(["submitted", "reupload_requested"]),
  reupload_note: z.string(),
  reupload_requested_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const paymentSchema = z.object({
  id: z.number(),
  kind: z.enum(["registration", "admission"]),
  amount: z.string(),
  status: z.enum(["initiated", "pending", "success", "failed", "cancelled"]),
  /** ICICI's name for online, "offline" for the desk, "receipt" for an uploaded UPI or bank receipt */
  gateway: z.string(),
  gateway_transaction_id: z.string(),
  receipt_url: z.string().nullable(),
  gateway_payment_mode: z.string(),
  failure_reason: z.string(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
});

export type Payment = z.infer<typeof paymentSchema>;

const feeItemSchema = z.object({
  id: z.number(),
  fee_type: z.string(),
  label: z.string(),
  amount: z.string(),
  frequency: z.enum(["one_time", "annual", "term", "monthly"]),
  annual_amount: z.string(),
  is_refundable: z.boolean(),
  is_optional: z.boolean(),
});

const feeGroupSchema = z.object({ items: z.array(feeItemSchema), total: z.string() });

/** GET children/<id>/fees/: the child's registration (step 2) and admission (step 7) fee plans */
export const childFeesSchema = z.object({
  plan: z.object({ campus: z.string(), academic_year: z.string(), grade: z.string(), terms_per_year: z.number() }),
  registration: feeGroupSchema,
  admission: feeGroupSchema,
  /** The campus's account for manual payments; null until the school sets it up */
  bank: z
    .object({ account_name: z.string(), account_number: z.string(), bank_name: z.string(), branch: z.string(), ifsc: z.string() })
    .nullable(),
});

export type ChildFees = z.infer<typeof childFeesSchema>;

/** A campus visit time, as parents see it */
export const slotSchema = z.object({
  id: z.number(),
  /** ISO date */
  date: z.string(),
  /** "10:30:00" */
  start_time: z.string(),
  duration_minutes: z.number(),
  visit_type: z.enum(["counsellor", "museum"]),
  visit_type_label: z.string(),
  stage: z.string(),
  gate: z.string(),
  staff_names: z.array(z.string()),
  capacity: z.number(),
  places_left: z.number(),
});

export type Slot = z.infer<typeof slotSchema>;

/** A before-joining checklist item (step 8) */
export const requirementSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string(),
  category: z.enum(["information", "documentation", "operational", "orientation", "final"]),
  owner: z.enum(["parent", "school", "operations"]),
  /** upload: satisfied by document_kind; confirm: the parent confirms; none: school's job */
  action: z.enum(["upload", "confirm", "none"]),
  document_kind: z.string(),
  status: z.enum(["not_started", "in_progress", "scheduled", "done"]),
  due_date: z.string().nullable(),
  done_at: z.string().nullable(),
});

export type Requirement = z.infer<typeof requirementSchema>;

export const visitSchema = z.object({
  id: z.number(),
  /** "booked" until the gate checks them in, then "attended" (the pass gets stamped) */
  status: z.enum(["booked", "attended"]),
  attended_at: z.string().nullable(),
  slot: slotSchema,
  campus_name: z.string(),
  campus_address: z.string(),
  /** Presigned campus photo for the ticket's poster; null if the campus has none */
  campus_image: z.string().nullable(),
  /** QR of the gate pass code, as an SVG data URI */
  gate_pass_qr: z.string(),
  gate_pass_code: z.string(),
  rescheduled_count: z.number(),
});

export type VisitBooking = z.infer<typeof visitSchema>;

/** A child on the enquiry, with its application form answers; each child has its own journey */
export const childSchema = z.object({
  id: z.number(),
  // Child
  first_name: text,
  last_name: text,
  preferred_name: text,
  /** ISO date; null until the form asks for it */
  date_of_birth: z.string().nullable(),
  gender: text,
  nationality: text,
  mother_tongue: text,
  home_languages: strings,
  grade: text,
  /** A schools.AcademicYear id of the chosen campus */
  academic_year: z.number().nullable(),
  academic_year_name: z.string().nullable(),
  campus: z.number().nullable(),
  // Previous schooling
  is_attending_school: z.boolean(),
  current_school: text,
  school_curriculum: text,
  school_class: text,
  school_city: text,
  attending_since: text,
  change_reason: text,
  // Health and support
  blood_group: text,
  allergies: strings,
  medical_conditions: text,
  takes_medication: z.boolean(),
  medication_details: text,
  needs_learning_support: z.boolean(),
  learning_support_details: text,
  hearing_sight_needs: text,
  paediatrician: text,
  // About your child
  interests: strings,
  heard_from: text,
  school_priorities: text,
  notes_for_counsellor: text,
  // Declarations
  declared_true: z.boolean(),
  consent_data: z.boolean(),
  consent_photo: z.boolean(),
  signature_name: text,
  // Journey
  documents: z.array(documentSchema),
  /** Every attempt, newest first; a fee is paid once one is "success" */
  payments: z.array(paymentSchema),
  /** The live visit booking (steps 3–4), if any */
  visit: visitSchema.nullable(),
  reference: text,
  /** 1–10, see JOURNEY_STEPS in lib/journey.ts; 11 once the journey is finished */
  current_step: z.number(),
  /**
   * Step 5 review: pending = in review, waitlisted, offered = accepted, rejected, not_offered.
   * Step 6 answer: declined, or withdrawn when the offer expired.
   */
  outcome: z.enum(["pending", "waitlisted", "offered", "rejected", "not_offered", "declined", "withdrawn"]),
  /** The counsellor's message with the decision */
  review_note: z.string(),
  reviewed_at: z.string().nullable(),
  // The offer (step 6): open 7 days from offer_sent_at, extendable once by 7
  offer_sent_at: z.string().nullable(),
  offer_expires_at: z.string().nullable(),
  offer_extended_at: z.string().nullable(),
  offer_accepted_at: z.string().nullable(),
  offer_declined_at: z.string().nullable(),
  offer_decline_reason: z.string(),
  /** First day at school, set by admissions */
  joining_date: z.string().nullable(),
  requirements: z.array(requirementSchema),
  /** Created by admissions in step 9; logins only, never passwords */
  atlas_accounts: z
    .object({
      created_at: z.string().nullable(),
      student: z.object({ name: z.string(), email: z.string() }),
      guardians: z.array(z.object({ name: z.string(), email: z.string(), relationship: z.string() })),
    })
    .nullable(),
  steps: z.array(z.object({ step: z.number(), completed_at: z.string() })),
});

export type Child = z.infer<typeof childSchema>;

export const guardianSchema = z.object({
  relationship: text,
  name: text,
  mobile: text,
  email: text,
  occupation: text,
  organisation: text,
  qualification: text,
  is_alumnus: z.boolean(),
  is_primary: z.boolean(),
});

export const emergencyContactSchema = z.object({
  name: text,
  relationship: text,
  mobile: text,
});

/** Admission lead as returned by /admission/leads/, /admission/otp/verify/ and /admission/me/ */
export const leadSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone_number: z.string(),
  campus: z.string(),
  enquiry_type: z.string(),
  access_token: z.string(),
  /** Where the login code goes, set on the server (SEND_ADMISSION_OTP_TO_EMAIL) */
  otp_channel: z.enum(["email", "sms"]),
  created_at: z.string(),
  children: z.array(childSchema),
  // Family sections of the application form, shared by every child
  address_line1: text,
  address_line2: text,
  locality: text,
  city: text,
  pin_code: text,
  state: text,
  wants_transport: z.boolean(),
  sibling_at_school: z.boolean(),
  sibling_name: text,
  sibling_grade: text,
  sibling_campus: z.number().nullable(),
  guardians: z.array(guardianSchema),
  emergency_contacts: z.array(emergencyContactSchema),
  // How the family wants updates; sign-in codes go regardless
  notify_whatsapp: z.boolean(),
  notify_email: z.boolean(),
  notify_sms: z.boolean(),
});

export type Lead = z.infer<typeof leadSchema>;

/** otp/verify adds the Bearer session the portal sends on every call */
export const verifiedLeadSchema = leadSchema.extend({ session: z.string() });

export type VerifiedLead = z.infer<typeof verifiedLeadSchema>;

export const otpSentSchema = z.object({
  channel: z.enum(["email", "sms"]),
  destination: z.string(),
  expires_in: z.number(),
  resend_in: z.number(),
});

export type OtpSent = z.infer<typeof otpSentSchema>;
export type OtpChannel = "email" | "sms";
