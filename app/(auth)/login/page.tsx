import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2Icon } from "lucide-react";
import { EnquiryLogin } from "@/components/auth/enquiry-login";

export const metadata: Metadata = { title: "Continue your application" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    // searchParams is request-time data, so it streams in behind <Suspense>
    <Suspense fallback={<Loader2Icon className="m-auto size-6 animate-spin text-white/60" />}>
      <EnquiryLoginWithToken searchParams={searchParams} />
    </Suspense>
  );
}

async function EnquiryLoginWithToken({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  // ?user=<access_token> comes from the link in the enquiry email
  const { user } = await searchParams;
  return <EnquiryLogin token={typeof user === "string" ? user : undefined} />;
}
