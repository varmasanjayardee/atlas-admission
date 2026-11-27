import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Atlas Admission",
    template: "%s | Atlas Admission",
  },
  description:
    "Apply online, track your application status, upload documents, and manage your admission to Atlas, all in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // next-themes sets the theme class before React hydrates
      suppressHydrationWarning
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        {/* Umami analytics (cookieless page views) */}
        {/* <Script src="https://cloud.umami.is/script.js" data-website-id="0926c78e-a7f4-4ad3-ab81-e34579262a9b" strategy="afterInteractive" /> */}
      </body>
    </html>
  );
}
