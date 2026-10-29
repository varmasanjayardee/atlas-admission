import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SESSION_KEY, api, hasSession } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  leadSchema,
  otpSentSchema,
  verifiedLeadSchema,
  type Lead,
  type OtpChannel,
  type OtpSent,
  type VerifiedLead,
} from "@/schemas/auth.schema";
import type { AuthUser } from "@/types/auth.types";

// Errors arrive as Error(message) from the interceptor in lib/api.ts

export const authKeys = {
  me: ["me"] as const,
};

const toUser = (lead: Lead): AuthUser => ({
  id: String(lead.id),
  name: `${lead.first_name} ${lead.last_name}`.trim(),
  email: lead.email,
  phone: lead.phone_number,
});

/** The verified lead behind the stored session; also fills the auth store */
export const meQuery = {
  queryKey: authKeys.me,
  queryFn: () =>
    api.get("/admission/me/").then((r) => {
      const lead = leadSchema.parse(r.data);
      useAuthStore.getState().setUser(toUser(lead));
      return lead;
    }),
  retry: false,
  staleTime: Infinity,
};

export function useMe() {
  return useQuery<Lead>({ ...meQuery, enabled: hasSession() });
}

/** Portal guard: no session, or an expired one, goes back to /login */
export function useRequireSession() {
  const router = useRouter();
  const me = useMe();
  const signedOut = !hasSession() || me.isError;

  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [signedOut, router]);

  return me;
}

interface SendOtpInput {
  accessToken: string;
  channel: OtpChannel;
}

/** Sends a code to the email/phone already on the lead (the API never takes a destination) */
export function useSendOtp() {
  return useMutation<OtpSent, Error, SendOtpInput>({
    mutationFn: ({ accessToken, channel }) =>
      api
        .post("/admission/otp/send/", { access_token: accessToken, channel })
        .then((r) => otpSentSchema.parse(r.data)),
    onError: (error) => toast.error(error.message),
  });
}

export function useVerifyOtp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<VerifiedLead, Error, SendOtpInput & { otp: string }>({
    mutationFn: ({ accessToken, channel, otp }) =>
      api
        .post("/admission/otp/verify/", { access_token: accessToken, channel, otp })
        .then((r) => verifiedLeadSchema.parse(r.data)),
    onSuccess: ({ session, ...lead }) => {
      localStorage.setItem(SESSION_KEY, session);
      // Seed me/ so the portal opens without refetching
      queryClient.setQueryData(authKeys.me, lead);
      setUser(toUser(lead));
      toast.success(`Welcome, ${lead.first_name}`);
      router.push("/");
    },
    onError: (error) => toast.error(error.message),
  });
}

/** The session is stateless on the server, so signing out is dropping it here */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((s) => s.clearUser);

  return () => {
    localStorage.removeItem(SESSION_KEY);
    clearUser();
    queryClient.clear();
    router.replace("/login");
  };
}
