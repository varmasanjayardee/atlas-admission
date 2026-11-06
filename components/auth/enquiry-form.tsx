"use client";

import type { ComponentProps } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldErrors } from "@/lib/api";
import { CAMPUSES } from "@/lib/campuses";
import { zodRule } from "@/lib/form";
import { enquiryFormSchema, type EnquiryFormInput, type Lead } from "@/schemas/auth.schema";
import { useCreateLead } from "@/services/enquiry.service";

interface EnquiryFormProps {
  /** The ?user= link didn't resolve to an enquiry */
  linkInvalid: boolean;
  /** True while the OTP for the new lead is being sent */
  isSendingOtp: boolean;
  onCreated: (lead: Lead) => void;
  /** "Already have an account?": sign in by email or mobile instead */
  onSignIn: () => void;
}

/** No enquiry link: capture the parent's details, then verify their number */
export function EnquiryForm({ linkInvalid, isSendingOtp, onCreated, onSignIn }: EnquiryFormProps) {
  const createLead = useCreateLead();
  const { control, register, handleSubmit, formState, setError } = useForm<EnquiryFormInput>({
    defaultValues: { phone_number: "", first_name: "", last_name: "", email: "", campus: "" },
  });
  const campus = useWatch({ control, name: "campus" });
  const address = CAMPUSES.find((c) => c.name === campus)?.address;
  const { errors } = formState;
  const isBusy = createLead.isPending || isSendingOtp;

  const field = (name: keyof EnquiryFormInput) =>
    register(name, { validate: zodRule(enquiryFormSchema[name]) });

  const onSubmit = handleSubmit((values) =>
    createLead.mutate(values, {
      onSuccess: onCreated,
      onError: (error) => {
        const fields = Object.entries(fieldErrors(error)).filter(([name]) => name in values);
        if (!fields.length) return toast.error(error.message);
        for (const [name, message] of fields) {
          setError(name as keyof EnquiryFormInput, { message }, { shouldFocus: true });
        }
      },
    })
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <h1 className="font-serif text-5xl leading-[1.1] italic sm:text-6xl">Start your enquiry.</h1>
      <p className="mt-6 text-lg leading-relaxed text-white/90">
        {linkInvalid
          ? "That link has expired or is no longer valid. Share your details below and we'll get you started again."
          : "Share a few details and verify your mobile number. We'll send you a 6-digit code."}
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <TextField
          id="phone_number"
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          autoFocus
          placeholder="+91 98100 41122"
          error={errors.phone_number?.message}
          {...field("phone_number")}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            id="first_name"
            label="First name"
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...field("first_name")}
          />
          <TextField
            id="last_name"
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...field("last_name")}
          />
        </div>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...field("email")}
        />
        <Field data-invalid={!!errors.campus}>
          <FieldLabel htmlFor="campus" className="text-white">
            Campus
          </FieldLabel>
          <select
            id="campus"
            aria-invalid={!!errors.campus}
            className="h-14 w-full rounded-xl border-0 bg-card px-4 text-base text-card-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            {...field("campus")}
          >
            <option value="">Select a campus</option>
            {CAMPUSES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {address && <p className="text-sm text-white/80">{address}</p>}
          <FieldError className="text-red-300">{errors.campus?.message}</FieldError>
        </Field>
      </div>

      <Button type="submit" size="lg" className="mt-8 h-14 rounded-xl text-lg font-semibold" disabled={isBusy}>
        {isBusy && <Loader2Icon className="animate-spin" />}
        Send code
      </Button>
      <p className="mt-5 text-center text-white/80">
        Already have an account?{" "}
        <button type="button" onClick={onSignIn} className="text-white underline underline-offset-4 hover:no-underline">
          Sign in
        </button>
      </p>
    </form>
  );
}

function TextField({ id, label, error, ...props }: { id: string; label: string; error?: string } & ComponentProps<typeof Input>) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id} className="text-white">
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        className="h-14 rounded-xl border-0 bg-card px-4 text-base text-card-foreground"
        {...props}
      />
      <FieldError className="text-red-300">{error}</FieldError>
    </Field>
  );
}
