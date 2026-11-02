"use client";

import { useForm } from "react-hook-form";
import { Loader2Icon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodRule } from "@/lib/form";

// An email, or a mobile with at least 10 digits; the server finds the enquiry either way
const identifierSchema = z
  .string()
  .trim()
  .refine((v) => (v.includes("@") ? z.email().safeParse(v).success : v.replace(/\D/g, "").length >= 10), "Enter the email or mobile number on your enquiry");

/** Returning parent without their link: one field, then the same OTP screen */
export function SignInForm({ isSending, onSubmit, onNewEnquiry }: { isSending: boolean; onSubmit: (identifier: string) => void; onNewEnquiry: () => void }) {
  const { register, handleSubmit, formState } = useForm({ defaultValues: { identifier: "" } });
  const error = formState.errors.identifier?.message;

  return (
    <form onSubmit={handleSubmit(({ identifier }) => onSubmit(identifier.trim()))} noValidate className="flex flex-col">
      <h1 className="font-serif text-5xl leading-[1.1] italic sm:text-6xl">Welcome back.</h1>
      <p className="mt-6 text-lg leading-relaxed text-white/90">Enter the email or mobile number on your enquiry. We&apos;ll send you a 6-digit code.</p>

      <Field data-invalid={!!error} className="mt-10">
        <FieldLabel htmlFor="identifier" className="text-white">
          Email or mobile number
        </FieldLabel>
        <Input
          id="identifier"
          autoFocus
          autoComplete="username"
          placeholder="you@example.com or +91 98100 41122"
          aria-invalid={!!error}
          className="h-14 rounded-xl border-0 bg-card px-4 text-base text-card-foreground"
          {...register("identifier", { validate: zodRule(identifierSchema) })}
        />
        <FieldError className="text-red-300">{error}</FieldError>
      </Field>

      <Button type="submit" size="lg" className="mt-8 h-14 rounded-xl text-lg font-semibold" disabled={isSending}>
        {isSending && <Loader2Icon className="animate-spin" />}
        Send code
      </Button>
      <p className="mt-5 text-center text-white/80">
        New here?{" "}
        <button type="button" onClick={onNewEnquiry} className="text-white underline underline-offset-4 hover:no-underline">
          Start an enquiry
        </button>
      </p>
    </form>
  );
}
