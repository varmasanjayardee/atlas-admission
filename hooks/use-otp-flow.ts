"use client";

import { useState } from "react";
import { useSendOtp } from "@/services/auth.service";
import type { OtpChannel } from "@/schemas/auth.schema";

export interface OtpTarget {
  accessToken: string;
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
    send: (accessToken: string, channel: OtpChannel = "sms") =>
      sendOtp.mutate(
        { accessToken, channel },
        { onSuccess: ({ destination }) => setTarget({ accessToken, channel, destination }) }
      ),
    close: () => setTarget(null),
  };
}
