"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ChevronLeftIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import type { OtpTarget } from "@/hooks/use-otp-flow";
import { zodRule } from "@/lib/form";
import { site } from "@/lib/site";
import { otpSchema } from "@/schemas/auth.schema";
import { useSendOtp, useVerifyOtp } from "@/services/auth.service";

// Matches the backend: 60s resend cooldown, 5 tries per code (admission/otp.py)
const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

interface OtpDialogProps {
  /** Where the code was sent; null keeps the dialog closed */
  target: OtpTarget | null;
  onClose: () => void;
}

/** Centered card on desktop, full screen on mobile */
export function OtpDialog({ target, onClose }: OtpDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 p-6 sm:max-w-md sm:rounded-3xl sm:p-10 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:ring-0"
      >
        {/* key resets the form and timer for a different lead or channel */}
        {target && (
          <OtpForm key={`${target.accessToken ?? target.identifier}:${target.channel}`} target={target} onBack={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OtpForm({ target, onBack }: { target: OtpTarget; onBack: () => void }) {
  const verifyOtp = useVerifyOtp();
  const sendOtp = useSendOtp();
  const secondsLeft = useCountdown(RESEND_SECONDS);
  const { control, handleSubmit, formState, reset } = useForm({
    defaultValues: { otp: "" },
  });
  const isComplete = useWatch({ control, name: "otp" }).length === OTP_LENGTH;
  const error = formState.errors.otp;

  const onSubmit = handleSubmit(({ otp }) =>
    verifyOtp.mutate(
      { accessToken: target.accessToken, identifier: target.identifier, channel: target.channel, otp },
      { onError: () => reset({ otp: "" }) }
    )
  );

  const resend = () =>
    sendOtp.mutate(
      { accessToken: target.accessToken, identifier: target.identifier, channel: target.channel },
      { onSuccess: secondsLeft.restart }
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex w-fit items-center gap-0.5 rounded-md px-1 py-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronLeftIcon className="size-4" />
        Back
      </button>

      <DialogTitle className="mt-5 text-3xl font-bold tracking-tight sm:text-2xl">
        Enter the code
      </DialogTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Sent to{" "}
        <span className="font-semibold break-all text-foreground">{target.destination}</span>
      </p>

      <Field data-invalid={!!error} className="mt-7">
        <FieldLabel htmlFor="otp" className="sr-only">
          Verification code
        </FieldLabel>
        <Controller
          name="otp"
          control={control}
          rules={{ validate: zodRule(otpSchema) }}
          render={({ field }) => (
            <InputOTP
              id="otp"
              maxLength={OTP_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              autoComplete="one-time-code"
              autoFocus
              value={field.value}
              onChange={field.onChange}
              onComplete={() => onSubmit()}
              disabled={verifyOtp.isPending}
              aria-invalid={!!error}
            >
              <InputOTPGroup className="w-full gap-2 sm:gap-3">
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    aria-invalid={!!error}
                    className="h-14 flex-1 rounded-xl border bg-card text-2xl first:rounded-xl last:rounded-xl"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        <FieldError>{error?.message}</FieldError>
      </Field>

      <div className="mt-4 flex items-center justify-between text-sm font-medium" aria-live="polite">
        {secondsLeft.value > 0 ? (
          <span className="text-muted-foreground">Resend code in {secondsLeft.value}s</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={sendOtp.isPending}
            className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        )}
        <a href={`tel:${site.helpLine}`} className="text-primary underline-offset-4 hover:underline">
          Need help?
        </a>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted p-4">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-semibold">The code is valid for 5 minutes</p>
          <p className="text-muted-foreground">After 5 wrong tries, request a new code</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6 sm:mt-0">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={!isComplete || verifyOtp.isPending}
        >
          {verifyOtp.isPending && <Loader2Icon className="animate-spin" />}
          Verify and continue
        </Button>
      </div>
    </form>
  );
}

function useCountdown(from: number) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (value <= 0) return;
    const t = setTimeout(() => setValue((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [value]);

  return { value, restart: () => setValue(from) };
}
