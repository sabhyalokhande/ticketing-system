import { redirect } from "next/navigation";
import type { Metadata } from "next";

// Keep the preview URL out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Private early-access URL: /preview/<secret>. It served the booking page
// before booking opened to the public; now that booking is live, anyone who
// still lands here (old links floating around) gets sent straight to the
// real page instead of a stale preview.
export default async function PreviewPage() {
  redirect("/");
}
