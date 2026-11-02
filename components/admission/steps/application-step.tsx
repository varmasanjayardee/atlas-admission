"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import type { AxiosError } from "axios";
import { ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  APPLICATION_SECTIONS,
  formProgress,
  sectionStats,
  sectionValues,
  visibleFields,
  type FormField,
  type FormSection,
  type Values,
} from "@/lib/application-form";
import { zodRule } from "@/lib/form";
import { useMediaQuery } from "@/hooks/use-media-query";
import { JOURNEY_STEPS } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { phoneSchema, type Child, type Lead } from "@/schemas/auth.schema";
import { useCampuses, useSaveChild, useSaveFamily, useSubmitApplication, useUploadDocument } from "@/services/admission.service";
import { useProfileStore } from "@/store/profile.store";
import { z } from "zod";
import { FieldInput, FileInput } from "./application-fields";
import { StepBody, StepFooter, type StepContentProps } from "./step-layout";

const nextTitle = JOURNEY_STEPS[1].title;

/** Step 1: the ten-section application form. Family sections are shared by every child. */
export function ApplicationStep({ admission, state, goNext, page }: StepContentProps) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const child = adding ? null : admission.child;
  const { lead } = admission;
  // Submitted: every answer stays visible, but changes go through the counsellor
  const readOnly = state === "done" && !adding;
  // As a page on a wide screen: sections on the left, the open one beside them (no drill-in)
  const split = useMediaQuery("(min-width: 1024px)") && !!page;

  const section =
    APPLICATION_SECTIONS.find((s) => s.id === open) ??
    (split ? (APPLICATION_SECTIONS.find((s) => !sectionStats(s, lead, child).complete) ?? APPLICATION_SECTIONS[0]) : undefined);
  const editor = section && (
    <SectionEditor
      // Fresh form per section and child
      key={`${section.id}:${child?.id ?? "new"}`}
      section={section}
      lead={lead}
      child={child}
      readOnly={readOnly}
      onBack={split ? undefined : () => setOpen(null)}
      onSaved={() => {
        setAdding(false);
        setOpen(APPLICATION_SECTIONS[APPLICATION_SECTIONS.indexOf(section) + 1]?.id ?? null);
      }}
      isLast={section === APPLICATION_SECTIONS[APPLICATION_SECTIONS.length - 1]}
    />
  );
  if (editor && !split) return editor;

  const overview = (
    <Overview
      lead={lead}
      child={child}
      readOnly={readOnly}
      adding={adding}
      onOpen={setOpen}
      onAddChild={() => setAdding(true)}
      onCancelAdd={() => setAdding(false)}
      onSubmitted={goNext}
      goNext={goNext}
      activeId={split ? section?.id : undefined}
    />
  );
  if (!split) return overview;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)] divide-x">
      <div className="flex min-h-0 flex-col">{overview}</div>
      <div className="flex min-h-0 flex-col">{editor}</div>
    </div>
  );
}

function Overview({
  lead,
  child,
  readOnly,
  adding,
  onOpen,
  onAddChild,
  onCancelAdd,
  onSubmitted,
  goNext,
  activeId,
}: {
  lead: Lead;
  child: Child | null;
  readOnly: boolean;
  adding: boolean;
  onOpen: (id: string) => void;
  onAddChild: () => void;
  onCancelAdd: () => void;
  onSubmitted: () => void;
  goNext: () => void;
  /** The section open beside the list (page layout) */
  activeId?: string;
}) {
  const submit = useSubmitApplication();
  const progress = formProgress(lead, child);
  const stats = APPLICATION_SECTIONS.map((s) => sectionStats(s, lead, child));
  const next = APPLICATION_SECTIONS.find((_, i) => !stats[i].complete);
  const childName = child ? `${child.first_name} ${child.last_name}`.trim() : null;

  const onSubmit = () =>
    child &&
    submit.mutate(child.id, {
      onSuccess: () => {
        toast.success("Application submitted");
        onSubmitted();
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <>
      <StepBody>
        <div className="flex items-center gap-4">
          <ProgressRing value={readOnly ? 100 : progress} />
          <div className="min-w-0">
            <p className="font-semibold">
              {readOnly ? `${childName}'s application is submitted` : adding || !child ? "New application" : `${childName}'s application`}
            </p>
            <p className="text-sm text-muted-foreground">
              {readOnly
                ? "Every answer can still be viewed. Changes go through your counsellor."
                : next
                  ? `Next: ${next.title}. Saved as you go.`
                  : "Everything required is filled in. Submit when you're ready."}
            </p>
          </div>
        </div>

        <ul className="divide-y rounded-xl border">
          {APPLICATION_SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const st = stats[i];
            // Child sections need the child saved first (documents hang off it)
            const blocked = s.scope === "child" && s.id !== "child" && !child;
            // Admissions sent one of this section's documents back
            const sentBack = s.fields.some(
              (f) => f.type === "file" && child?.documents.some((d) => d.kind === f.key && d.status === "reupload_requested")
            );
            const status = sentBack
              ? "New copy needed"
              : readOnly
                ? "Submitted"
              : blocked
                ? "Add the child's details first"
                : st.required === 0
                  ? "Optional"
                  : st.complete
                    ? "Complete"
                    : `${st.missing} required left`;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onOpen(s.id)}
                  aria-current={activeId === s.id ? "step" : undefined}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted disabled:opacity-50 disabled:hover:bg-transparent aria-[current=step]:bg-primary/5"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      sentBack
                        ? "bg-destructive text-white"
                        : st.complete || readOnly
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {st.complete && !readOnly ? <CircleCheckIcon className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.title}</span>
                    <span className={cn("block text-xs", sentBack ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {s.scope === "family" && !readOnly ? `${status} · shared by all your children` : status}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>

        {adding ? (
          <button type="button" onClick={onCancelAdd} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Cancel and go back
          </button>
        ) : (
          child && (
            <Button type="button" variant="outline" className="w-full rounded-xl border-dashed" onClick={onAddChild}>
              <PlusIcon />
              Add another child
            </Button>
          )
        )}
      </StepBody>

      <StepFooter>
        {readOnly ? (
          <Button size="lg" className="h-12 rounded-xl text-base font-semibold" onClick={goNext}>
            Next: {nextTitle}
          </Button>
        ) : (
          <>
            <p className="text-center text-xs text-muted-foreground">Answers can&apos;t be changed after you submit.</p>
            <Button
              size="lg"
              className="h-12 rounded-xl text-base font-semibold"
              disabled={!child || progress < 100 || submit.isPending}
              onClick={onSubmit}
            >
              {submit.isPending && <Loader2Icon className="animate-spin" />}
              {progress < 100 ? "Complete the required fields to submit" : "Submit application"}
            </Button>
          </>
        )}
      </StepFooter>
    </>
  );
}

export function ProgressRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center" role="img" aria-label={`${value}% complete`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="stroke-primary transition-[stroke-dashoffset]" />
      </svg>
      <span className="text-sm font-semibold tabular-nums">{value}%</span>
    </span>
  );
}

// ---------------------------------------------------------------------------

type FormValues = { values: Values; rows: Values[] };

const emptyOf = (field: FormField) => (field.type === "toggle" ? false : field.type === "chips" ? [] : field.options === "campuses" || field.options === "academic_years" ? null : "");

const rulesOf = (field: FormField) =>
  field.type === "tel"
    ? { validate: (v: unknown) => !v || zodRule(phoneSchema)(v) }
    : field.type === "email"
      ? { validate: (v: unknown) => !v || zodRule(z.email("Enter a valid email address"))(v) }
      : undefined;

const answerFields = (section: FormSection) => section.fields.filter((f) => f.type !== "file");

function initialValues(section: FormSection, lead: Lead, child: Child | null): FormValues {
  const blank = (): Values => Object.fromEntries(answerFields(section).map((f) => [f.key, emptyOf(f)]));

  if (section.repeat) {
    const saved = lead[section.repeat.key] as Values[];
    const rows = saved.length ? saved.map((row) => ({ ...blank(), ...row })) : [];
    // Start the parent off with themselves, from the enquiry
    if (!rows.length && section.repeat.key === "guardians") {
      rows.push({ ...blank(), name: `${lead.first_name} ${lead.last_name}`.trim(), mobile: lead.phone_number, email: lead.email, is_primary: true });
    }
    while (rows.length < section.repeat.min) rows.push(blank());
    return { values: {}, rows };
  }

  const saved = sectionValues(section, lead, child);
  return {
    values: Object.fromEntries(answerFields(section).map((f) => [f.key, saved[f.key] ?? emptyOf(f)])),
    rows: [],
  };
}

function SectionEditor({
  section,
  lead,
  child,
  readOnly,
  onBack,
  onSaved,
  isLast,
}: {
  section: FormSection;
  lead: Lead;
  child: Child | null;
  readOnly: boolean;
  /** Back to the section list; absent when the list sits beside the form */
  onBack?: () => void;
  onSaved: () => void;
  isLast: boolean;
}) {
  const saveChild = useSaveChild();
  const saveFamily = useSaveFamily();
  const upload = useUploadDocument(child?.id);
  // Files picked for a child not saved yet, uploaded once it is
  const [picked, setPicked] = useState<Record<string, File>>({});
  const selectStudent = useProfileStore((s) => s.selectStudent);
  const { data: campuses = [] } = useCampuses();
  const { control, handleSubmit, setError, setValue } = useForm<FormValues>({ defaultValues: initialValues(section, lead, child) });
  const rows = useFieldArray({ control, name: "rows" });
  const index = APPLICATION_SECTIONS.indexOf(section);
  const isBusy = saveChild.isPending || saveFamily.isPending || upload.isPending;

  // DRF errors: { field: ["msg"] } for answers, { guardians: [{ mobile: ["msg"] }, {}] } for rows
  const showErrors = (error: Error) => {
    const data = (error.cause as AxiosError | undefined)?.response?.data as Record<string, unknown> | undefined;
    let shown = false;
    for (const [key, value] of Object.entries(data ?? {})) {
      if (section.repeat && key === section.repeat.key && Array.isArray(value)) {
        value.forEach((row, i) =>
          Object.entries((row ?? {}) as Record<string, string[]>).forEach(([k, msgs]) => {
            setError(`rows.${i}.${k}`, { message: msgs[0] }, { shouldFocus: !shown });
            shown = true;
          })
        );
      } else if (Array.isArray(value) && typeof value[0] === "string" && section.fields.some((f) => f.key === key)) {
        setError(`values.${key}`, { message: value[0] }, { shouldFocus: !shown });
        shown = true;
      }
    }
    if (!shown) toast.error(error.message);
  };

  const onSubmit = handleSubmit(async ({ values, rows: list }) => {
    if (readOnly) return onSaved();
    try {
      if (section.repeat) {
        await saveFamily.mutateAsync({ [section.repeat.key]: list });
      } else if (section.scope === "family") {
        await saveFamily.mutateAsync(values);
      } else {
        // The API wants null, not "", for an empty date
        const payload = { ...values, ...("date_of_birth" in values && { date_of_birth: values.date_of_birth || null }) };
        const saved = await saveChild.mutateAsync({ id: child?.id, values: payload });
        // A new child becomes the one being viewed (before uploading, so a failed upload can't lead to saving them twice)
        if (!child) selectStudent(String(saved.id));
        for (const [kind, file] of Object.entries(picked)) await upload.mutateAsync({ kind, file, childId: saved.id });
        setPicked({});
      }
      onSaved();
    } catch (error) {
      showErrors(error as Error);
    }
  });

  const answers = (prefix: `values` | `rows.${number}`, fields: FormField[], values?: Values) =>
    fields.map((field) =>
      field.type === "file" ? (
        <FileInput
          key={field.key}
          field={field}
          child={child}
          disabled={readOnly}
          picked={picked[field.key]}
          onPick={(file) => setPicked((p) => ({ ...p, [field.key]: file }))}
        />
      ) : (
        <Controller
          key={field.key}
          control={control}
          name={`${prefix}.${field.key}` as `values.${string}`}
          rules={rulesOf(field)}
          render={({ field: input, fieldState }) => (
            <FieldInput
              field={field}
              value={input.value}
              onChange={(value) => {
                input.onChange(value);
                // A new campus has its own academic years
                if (prefix === "values" && field.key === "campus") setValue("values.academic_year", null);
              }}
              campuses={campuses}
              years={campuses.find((c) => c.id === values?.campus)?.academic_years ?? []}
              error={fieldState.error?.message}
              disabled={readOnly}
            />
          )}
        />
      )
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <StepBody className="space-y-6">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 mb-2 flex items-center gap-0.5 rounded-md px-1 py-1 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronLeftIcon className="size-4" />
              All sections
            </button>
          )}
          <h3 className="text-lg font-semibold">{section.title}</h3>
          <p className="text-xs text-muted-foreground">
            Section {index + 1} of {APPLICATION_SECTIONS.length}
            {section.scope === "family" && " · shared by all your children"}
          </p>
        </div>

        {section.repeat ? (
          <>
            {rows.fields.map((row, i) => (
              <fieldset key={row.id} className="space-y-5 rounded-xl border p-4">
                <legend className="flex w-full items-center justify-between px-1 text-sm font-semibold">
                  {section.repeat!.one} {i + 1}
                </legend>
                <RepeatRow control={control} index={i} section={section} render={(fields) => answers(`rows.${i}`, fields)} />
                {!readOnly && rows.fields.length > section.repeat!.min && (
                  <button type="button" onClick={() => rows.remove(i)} className="text-sm font-medium text-destructive hover:underline">
                    Remove
                  </button>
                )}
              </fieldset>
            ))}
            {!readOnly && rows.fields.length < 6 && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-dashed"
                onClick={() => rows.append(Object.fromEntries(answerFields(section).map((f) => [f.key, emptyOf(f)])))}
              >
                <PlusIcon />
                {section.repeat.add}
              </Button>
            )}
          </>
        ) : (
          <SectionAnswers control={control} section={section} child={child} render={(fields, values) => answers("values", fields, values)} />
        )}
      </StepBody>

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 rounded-xl text-base font-semibold" disabled={isBusy}>
          {isBusy && <Loader2Icon className="animate-spin" />}
          {readOnly ? (isLast ? "Back to all sections" : "Next section") : isLast ? "Save and review" : "Save and continue"}
        </Button>
      </StepFooter>
    </form>
  );
}

// Watches only what `when` conditions need, so toggles show and hide their follow-ups
function SectionAnswers({
  control,
  section,
  child,
  render,
}: {
  control: Control<FormValues>;
  section: FormSection;
  child: Child | null;
  render: (fields: FormField[], values: Values) => React.ReactNode;
}) {
  const values = useWatch({ control, name: "values" });
  const uploaded = Object.fromEntries((child?.documents ?? []).map((d) => [d.kind, d]));
  return <div className="space-y-5">{render(visibleFields(section, { ...values, ...uploaded }), values)}</div>;
}

function RepeatRow({
  control,
  index,
  section,
  render,
}: {
  control: Control<FormValues>;
  index: number;
  section: FormSection;
  render: (fields: FormField[]) => React.ReactNode;
}) {
  const row = useWatch({ control, name: `rows.${index}` });
  return <>{render(visibleFields(section, row ?? {}))}</>;
}
