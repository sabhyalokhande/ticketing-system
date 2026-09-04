import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidPreviewCode } from "@/lib/config";
import { BookingPortal } from "@/components/BookingPortal";

// Keep the preview URL out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Private early-access URL: /preview/<secret>. Shows the full booking page
// (poster + working form) before booking opens to the public. Any other code
// 404s, and the public root URL is never affected by this route.
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;

  if (!isValidPreviewCode(code)) {
    notFound();
  }

  return <BookingPortal error={error} previewCode={code} />;
}
