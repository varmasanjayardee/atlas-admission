"use client";

import { useId } from "react";
import { CameraIcon, CircleCheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FormField, Option } from "@/lib/application-form";
import { cn } from "@/lib/utils";
import type { Child } from "@/schemas/auth.schema";
import { useUploadDocument } from "@/services/admission.service";

const optionOf = (o: Option) => (typeof o === "string" ? { value: o, label: o } : o);

const control = "h-11 w-full rounded-lg border bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 aria-invalid:border-destructive md:text-sm";
const pill = "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground";

interface FieldInputProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  campuses: { id: number; name: string }[];
  /** The chosen campus's academic years, for options: "academic_years" */
  years: { id: number; name: string }[];
  error?: string;
  disabled?: boolean;
}

/** One application form answer, drawn from its config in lib/application-form.ts */
export function FieldInput({ field, value, onChange, campuses, years, error, disabled }: FieldInputProps) {
  console.log("FieldInput", { field, value, error, disabled });
  const id = useId();
  const byId = field.options === "campuses" || field.options === "academic_years";
  const options =
    field.options === "campuses"
      ? campuses.map((c) => ({ value: String(c.id), label: c.name }))
      : field.options === "academic_years"
        ? years.map((y) => ({ value: String(y.id), label: y.name }))
        : (field.options ?? []).map(optionOf);
  const label = (
    <>
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </>
  );

  if (field.type === "toggle") {
    return (
      <Field data-invalid={!!error}>
        <div className="flex items-center justify-between gap-4">
          <span>
            <FieldLabel htmlFor={id} className="font-normal">
              {label}
            </FieldLabel>
            {field.help && <FieldDescription>{field.help}</FieldDescription>}
          </span>
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={!!value}
            disabled={disabled}
            onClick={() => onChange(!value)}
            className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/25 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 aria-checked:bg-primary"
          >
            <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform", !!value && "translate-x-5")} />
          </button>
        </div>
        <FieldError>{error}</FieldError>
      </Field>
    );
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      {field.type === "select" ? (
        <select
          id={id}
          className={control}
          aria-invalid={!!error}
          disabled={disabled}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(byId ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        >
          <option value="">Choose</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          className={cn(control, "h-auto py-2")}
          aria-invalid={!!error}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "seg" ? (
        <div role="group" aria-label={field.label} className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.value} type="button" aria-pressed={value === o.value} disabled={disabled} onClick={() => onChange(o.value)} className={pill}>
              {o.label}
            </button>
          ))}
        </div>
      ) : field.type === "chips" ? (
        <div role="group" aria-label={field.label} className="flex flex-wrap gap-2">
          {options.map((o) => {
            const list = (value as string[] | undefined) ?? [];
            const on = list.includes(o.value);
            // "None" can't sit alongside anything else
            const toggle = () =>
              onChange(on ? list.filter((v) => v !== o.value) : o.value === "None" ? ["None"] : [...list.filter((v) => v !== "None"), o.value]);
            return (
              <button key={o.value} type="button" aria-pressed={on} disabled={disabled} onClick={toggle} className={pill}>
                {o.label}
              </button>
            );
          })}
        </div>
      ) : (
        <Input
          id={id}
          type={field.type}
          className="h-11 rounded-lg"
          aria-invalid={!!error}
          disabled={disabled}
          autoComplete={field.type === "tel" ? "tel" : field.type === "email" ? "email" : "off"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.help && <FieldDescription>{field.help}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** A document answer: uploads as soon as a file is chosen */
/**
 * One document upload. Before the child is saved there's nowhere to upload to, so the
 * file is held (`picked`/`onPick`) and the form uploads it right after saving the child.
 */
export function FileInput({
  field,
  child,
  disabled,
  picked,
  onPick,
}: {
  field: FormField;
  child: Child | null;
  disabled?: boolean;
  picked?: File;
  onPick?: (file: File) => void;
}) {
  const id = useId();
  const upload = useUploadDocument(child?.id);
  const document = child?.documents.find((d) => d.kind === field.key);
  // Admissions sent it back: replaceable even once the application is submitted
  const sentBack = document?.status === "reupload_requested";
  const locked = (disabled && !sentBack) || (!child && !onPick);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("The file is larger than 10 MB.");
    if (!child) return onPick?.(file);
    upload.mutate({ kind: field.key, file }, { onSuccess: () => toast.success(`${field.label} uploaded`), onError: (e) => toast.error(e.message) });
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          locked && "cursor-not-allowed opacity-60",
          sentBack && "border-destructive bg-destructive/5"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {upload.isPending ? <Loader2Icon className="size-4 animate-spin" /> : document || picked ? <CircleCheckIcon className="size-4" /> : <CameraIcon className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{document?.original_name ?? picked?.name ?? "Take a photo or choose a file"}</span>
          <span className="block text-xs text-muted-foreground">
            {!child
              ? picked
                ? "Uploads when you save this section"
                : "PDF, JPG or PNG, up to 10 MB"
              : sentBack
                ? `Admissions asked for a new copy: ${document.reupload_note}`
                : document
                  ? disabled
                    ? "Submitted"
                    : "Choose another file to replace it"
                  : "PDF, JPG or PNG, up to 10 MB"}
          </span>
        </span>
        {document?.url && (
          <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            View
          </a>
        )}
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          disabled={locked || upload.isPending}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {field.help && <FieldDescription>{field.help}</FieldDescription>}
    </Field>
  );
}
