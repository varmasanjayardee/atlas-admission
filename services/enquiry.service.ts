import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { leadSchema, type EnquiryFormInput, type Lead } from "@/schemas/auth.schema";

export const enquiryKeys = {
  lead: (token: string) => ["lead", token] as const,
};

// Lead behind the secure link (/login?user=<access_token>). No token means a new enquiry.
export function useLead(token?: string) {
  return useQuery<Lead>({
    queryKey: enquiryKeys.lead(token ?? ""),
    queryFn: () => api.get(`/admission/leads/${token}/`).then((r) => leadSchema.parse(r.data)),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });
}

/** New enquiry from the login page; the form shows field errors itself */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation<Lead, Error, EnquiryFormInput>({
    mutationFn: (data) => api.post("/admission/leads/", data).then((r) => leadSchema.parse(r.data)),
    // Seed the cache so the page can switch to ?user=<token> without refetching
    onSuccess: (lead) => queryClient.setQueryData(enquiryKeys.lead(lead.access_token), lead),
  });
}
