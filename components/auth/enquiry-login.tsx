"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnquiryForm } from "@/components/auth/enquiry-form";
import { EnquiryOverview, NextSteps } from "@/components/auth/enquiry-summary";
import { OtpDialog } from "@/components/auth/otp-dialog";
import { useOtpFlow } from "@/hooks/use-otp-flow";
import { maskPhone } from "@/lib/format";
import type { Lead } from "@/schemas/auth.schema";
import { useMe } from "@/services/auth.service";
import { useLead } from "@/services/enquiry.service";

/**
 * The only sign-in page.
 * - /login?user=<access_token> (from the enquiry email): show the enquiry, verify the number on file.
 * - /login, or a dead link: capture a new enquiry, then verify that number.
 */
export function EnquiryLogin({ token: linkToken }: { token?: string }) {
  const [token, setToken] = useState(linkToken);
  const { data: lead, isLoading, isError } = useLead(token);
  const otp = useOtpFlow();
  const router = useRouter();
  const { data: me } = useMe();

  // Already verified on this device: skip the OTP, unless the link is for another enquiry
  const signedIn = !!me && (!token || me.access_token === token);
  useEffect(() => {
    if (signedIn) router.replace("/");
  }, [signedIn, router]);

  // Native history keeps the router in sync without re-rendering the page,
  // so a refresh resumes on the same enquiry and the OTP dialog stays open
  const switchToken = (next?: string) => {
    setToken(next);
    window.history.replaceState(null, "", next ? `?user=${next}` : window.location.pathname);
  };

  const onCreated = (created: Lead) => {
    switchToken(created.access_token);
    otp.send(created.access_token);
  };

  if (isLoading) {
    return <Loader2Icon className="m-auto size-6 animate-spin text-white/60" aria-label="Loading your enquiry" />;
  }

  return (
    <>
      {lead ? (
        <div className="flex flex-col">
          <h1 className="font-serif text-5xl leading-[1.1] italic sm:text-6xl">
            Hello {lead.first_name},
            <br />
            Welcome to Ardee.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/90">
            This secure link is tied to your enquiry. What you told us is already filled in, so you will
            not be asked twice.
          </p>

          <div className="mt-10 flex flex-col gap-10">
            <EnquiryOverview lead={lead} />
            <NextSteps />
          </div>

          <Button
            size="lg"
            className="mt-10 h-14 rounded-xl text-lg font-semibold"
            onClick={() => otp.send(lead.access_token)}
            disabled={otp.isSending}
          >
            {otp.isSending && <Loader2Icon className="animate-spin" />}
            Verify {maskPhone(lead.phone_number)}
            {!otp.isSending && <ArrowRightIcon data-icon="inline-end" />}
          </Button>
          <p className="mt-5 text-center text-white/80">
            Not {lead.first_name}?{" "}
            <button
              type="button"
              onClick={() => switchToken(undefined)}
              className="text-white underline underline-offset-4 hover:no-underline"
            >
              Start a new enquiry
            </button>
          </p>
        </div>
      ) : (
        <EnquiryForm linkInvalid={!!token && isError} isSendingOtp={otp.isSending} onCreated={onCreated} />
      )}

      <OtpDialog target={otp.target} onClose={otp.close} />
    </>
  );
}
