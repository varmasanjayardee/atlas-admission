"use client";

import { useState } from "react";
import { useSendOtp } from "@/services/auth.service";
import type { OtpChannel } from "@/schemas/auth.schema";

export interface OtpTarget {
  /** The enquiry link's token, or the email or mobile typed to sign in */
  accessToken?: string;
  identifier?: string;
  channel: OtpChannel;
  /** Masked by the server, e.g. "*********3210" */
  destination: string;
}

// Sends a code, then remembers where it went so the OTP dialog can open
export function useOtpFlow() {
  const sendOtp = useSendOtp();
  const [target, setTarget] = useState<OtpTarget | null>(null);

  return {
    target,
    isSending: sendOtp.isPending,
    // The server decides where the code goes; `channel` (the lead's otp_channel) is for display
    send: (accessToken: string, channel: OtpChannel) =>
      sendOtp.mutate(
        { accessToken, channel },
        { onSuccess: ({ destination }) => setTarget({ accessToken, channel, destination }) }
      ),
    /** Returning parent: the server finds the enquiry by email or mobile and picks the channel */
    signIn: (identifier: string) =>
      sendOtp.mutate(
        { identifier, channel: "email" },
        { onSuccess: ({ destination, channel }) => setTarget({ identifier, channel, destination }) }
      ),
    close: () => setTarget(null),
  };
}
