import type { Metadata } from "next";

import "./globals.css";

function toMetadataBase(rawUrl: string | undefined) {
  if (!rawUrl) return new URL("https://panta-lens.invalid");
  return new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
}

export const metadata: Metadata = {
  metadataBase: toMetadataBase(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.VERCEL_URL,
  ),
  title: {
    default: "Panta Lens",
    template: "%s | Panta Lens",
  },
  description:
    "Read-only Panta prediction market intelligence for verified prices, lifecycle, and recorded activity.",
  applicationName: "Panta Lens",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Panta Lens",
    title: "Panta Lens",
    description:
      "Read-only Panta prediction market intelligence for verified prices, lifecycle, and recorded activity.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panta Lens",
    description:
      "Read-only Panta prediction market intelligence for verified prices, lifecycle, and recorded activity.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
