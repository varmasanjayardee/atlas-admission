import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, hasSession } from "@/lib/api";
import { z } from "zod";
import type { Values } from "@/lib/application-form";
import {
  childFeesSchema,
  childSchema,
  leadSchema,
  paymentSchema,
  slotSchema,
  type Child,
  type Lead,
  type Payment,
} from "@/schemas/auth.schema";
import { authKeys, meQuery } from "@/services/auth.service";
import type { Admission, Student } from "@/types/admission.types";

const toStudents = (lead: Lead): Student[] =>
  lead.children.map((child) => ({
    id: String(child.id),
    name: `${child.first_name} ${child.last_name}`.trim(),
    grade: child.grade,
  }));

function toAdmission(lead: Lead, studentId: string): Admission {
  const child = lead.children.find((c) => String(c.id) === studentId) ?? null;
  return {
    studentId,
    currentStep: child?.current_step ?? 1,
    enquiryDate: lead.created_at,
    outcome: child?.outcome ?? "pending",
    child,
    lead,
    campus: lead.campus,
    parentName: `${lead.first_name} ${lead.last_name}`.trim(),
    visit: child?.visit
      ? { date: child.visit.slot.date, time: child.visit.slot.start_time.slice(0, 5), gate: child.visit.slot.gate }
      : null,
    counsellor: null,
  };
}

/** Children on the verified enquiry (read from me/, no extra request) */
export function useStudents() {
  return useQuery({ ...meQuery, enabled: hasSession(), select: toStudents });
}

/** One child's journey, also from me/ */
export function useAdmission(studentId: string | undefined) {
  return useQuery({
    ...meQuery,
    enabled: hasSession() && !!studentId,
    select: (lead: Lead) => toAdmission(lead, studentId!),
  });
}

const campusSchema = z.array(z.object({ id: z.number(), name: z.string() }));

/** Campus choices for the application form */
export function useCampuses() {
  return useQuery({
    queryKey: ["campuses"],
    queryFn: () => api.get("/admission/campuses/").then((r) => campusSchema.parse(r.data)),
    enabled: hasSession(),
    staleTime: Infinity,
  });
}

/** Step 1, child sections: add a child (no id) or update one still on the application step */
export function useSaveChild() {
  const queryClient = useQueryClient();

  return useMutation<Child, Error, { id?: number; values: Values }>({
    mutationFn: ({ id, values }) =>
      (id ? api.patch(`/admission/children/${id}/`, values) : api.post("/admission/children/", values)).then((r) =>
        childSchema.parse(r.data)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

/** Step 1, family sections (address, guardians, siblings, emergency contacts); shared by every child */
export function useSaveFamily() {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, Values>({
    mutationFn: (values) => api.patch("/admission/me/", values).then((r) => leadSchema.parse(r.data)),
    onSuccess: (lead) => queryClient.setQueryData(authKeys.me, lead),
  });
}

/**
 * Documents go straight to storage: sign (keyed-backend checks kind, type, size and
 * the step), PUT the file to the presigned URL, then attach the key to the child.
 */
async function uploadDocument(documentsUrl: string, kind: string, file: File) {
  const contentType = file.type || ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" } as Record<string, string>)[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
  const signed = await api
    .post(`${documentsUrl}sign/`, { kind, filename: file.name, content_type: contentType, size: file.size })
    .then((r) => r.data as { key: string; upload_url: string; content_type: string });
  const put = await fetch(signed.upload_url, { method: "PUT", headers: { "Content-Type": signed.content_type }, body: file }).catch(() => null);
  if (!put?.ok) throw new Error("The file didn't reach storage. Check the connection and try again.");
  return api.post(documentsUrl, { kind, file_key: signed.key, original_name: file.name });
}

/** Uploads (or replaces) one document on a child's application */
export function useUploadDocument(childId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Child, Error, { kind: string; file: File }>({
    mutationFn: ({ kind, file }) => uploadDocument(`/admission/children/${childId}/documents/`, kind, file).then((r) => childSchema.parse(r.data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

/** Finishes step 1; the server checks the required details and moves the child to step 2 */
export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation<Child, Error, number>({
    mutationFn: (id) => api.post(`/admission/children/${id}/submit/`).then((r) => childSchema.parse(r.data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

/** The fee plan for a child's campus, year and grade; 404 until the counsellor publishes one */
export function useChildFees(childId: number | undefined) {
  return useQuery({
    queryKey: ["fees", childId],
    queryFn: () => api.get(`/admission/children/${childId}/fees/`).then((r) => childFeesSchema.parse(r.data)),
    enabled: !!childId,
    retry: false,
  });
}

const startedSchema = z.object({ payment: paymentSchema, redirect_url: z.string() });

/** Starts a journey payment, then leaves for ICICI; the webhook brings the browser back */
export function useStartPayment(childId: number) {
  return useMutation<{ payment: Payment; redirect_url: string }, Error, Payment["kind"]>({
    mutationFn: (kind) =>
      api.post(`/admission/children/${childId}/payments/${kind}/`).then((r) => startedSchema.parse(r.data)),
    onSuccess: ({ redirect_url }) => window.location.assign(redirect_url),
  });
}

/** Asks the server to re-check an unfinished payment with ICICI */
export function useRefreshPayment(childId: number) {
  const queryClient = useQueryClient();

  return useMutation<Child, Error, number>({
    mutationFn: (paymentId) =>
      api.post(`/admission/children/${childId}/payments/${paymentId}/refresh/`).then((r) => childSchema.parse(r.data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

/** Visit slots this child can book (their campus and stage, next three weeks) */
export function useChildSlots(childId: number, enabled = true) {
  return useQuery({
    queryKey: ["slots", childId],
    queryFn: () => api.get(`/admission/children/${childId}/slots/`).then((r) => z.array(slotSchema).parse(r.data)),
    enabled,
    staleTime: 0,
  });
}

type VisitChange =
  | { action: "book"; slot: number; hearing_aid: boolean }
  | { action: "reschedule"; slot: number; hearing_aid: boolean }
  | { action: "cancel" };

/** Book (step 3 -> 4), reschedule, or cancel (back to step 3) the child's campus visit */
export function useChangeVisit(childId: number) {
  const queryClient = useQueryClient();
  const url = `/admission/children/${childId}/visit/`;

  return useMutation<Child, Error, VisitChange>({
    mutationFn: (change) =>
      (change.action === "cancel"
        ? api.delete(url)
        : change.action === "book"
          ? api.post(url, { slot: change.slot, hearing_aid: change.hearing_aid })
          : api.patch(url, { slot: change.slot, hearing_aid: change.hearing_aid })
      ).then((r) => childSchema.parse(r.data)),
    // Refresh places either way: a 409 means the list is stale
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.me }),
        queryClient.invalidateQueries({ queryKey: ["slots", childId] }),
      ]),
  });
}

/** Downloads the visit pass PDF (needs the Bearer session, so not a plain link) */
export function useDownloadVisitPass(childId: number) {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const r = await api.get<Blob>(`/admission/children/${childId}/visit/pass/`, { responseType: "blob" });
      const name = /filename="([^"]+)"/.exec(String(r.headers["content-disposition"]))?.[1] ?? "ardee-visit-pass.pdf";
      const url = URL.createObjectURL(r.data);
      const link = Object.assign(document.createElement("a"), { href: url, download: name });
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}

export const gateVisitSchema = z.object({
  code: z.string(),
  status: z.enum(["booked", "attended"]),
  attended_at: z.string().nullable(),
  child: z.string(),
  grade: z.string(),
  family: z.string(),
  reference: z.string(),
  campus: z.string(),
  date: z.string(),
  start_time: z.string(),
  gate: z.string(),
  visit_type: z.string(),
  staff: z.array(z.string()),
  hearing_aid: z.boolean(),
  is_today: z.boolean(),
});

export type GateVisit = z.infer<typeof gateVisitSchema>;

/** Gate check-in (temporary, gate key in the body): look a pass up, or approve it (step 4 -> 5) */
export function useGateCheck(action: "lookup" | "approve") {
  return useMutation<GateVisit, Error, { code: string; gateKey: string }>({
    mutationFn: ({ code, gateKey }) =>
      api.post(`/admission/gate/${action}/`, { code, gate_key: gateKey }).then((r) => gateVisitSchema.parse(r.data)),
  });
}

export const DECLINE_REASONS = ["Chose another school", "Relocating", "Fees", "Timing", "Prefer not to say"] as const;

type OfferAnswer =
  | { action: "accept"; agreed: true }
  | { action: "extend" }
  | { action: "decline"; reason: (typeof DECLINE_REASONS)[number] };

/** Step 6: accept the offer (-> step 7), extend it once by 7 days, or decline it */
export function useAnswerOffer(childId: number) {
  const queryClient = useQueryClient();

  return useMutation<Child, Error, OfferAnswer>({
    mutationFn: (answer) => api.post(`/admission/children/${childId}/offer/`, answer).then((r) => childSchema.parse(r.data)),
    // An expired offer is closed server-side even on error, so refresh either way
    onSettled: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

/** Step 8: the parent confirms a checklist item; the last parent item moves the child to step 9 */
export function useConfirmRequirement(childId: number) {
  const queryClient = useQueryClient();

  return useMutation<Child, Error, number>({
    mutationFn: (id) => api.post(`/admission/children/${childId}/joining/${id}/confirm/`).then((r) => childSchema.parse(r.data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}
