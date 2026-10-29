"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The open journey step lives in the URL (?step=2) so refresh and shared links keep it */
export function useStepParam() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const step = Number(searchParams.get("step")) || null;

  const setStep = (next: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("step", String(next));
    else params.delete("step");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return { step, setStep };
}
