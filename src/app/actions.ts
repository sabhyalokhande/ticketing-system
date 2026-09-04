"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateBookingRef } from "@/lib/ref";
import { expireStaleBookings } from "@/lib/expiry";
import { isBookingOpen, isValidPreviewCode } from "@/lib/config";

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit WhatsApp number"),
  categoryId: z.string().min(1, "Select a category"),
  regionId: z.string().min(1, "Select a region"),
  quantity: z.coerce.number().int().min(1, "At least 1 ticket").max(10, "Max 10 tickets per request"),
});

export async function createBooking(formData: FormData) {
  // Belt-and-braces: the form itself is hidden until this instant, but
  // enforce it here too so nobody can jump the first-come-first-served
  // queue by posting directly. A valid preview code (submitted as a hidden
  // field from /preview/<code>) is the only early-access path.
  const previewCode = String(formData.get("previewCode") ?? "");
  const viaPreview = isValidPreviewCode(previewCode);
  // Where to send the user back to if their submission is rejected.
  const backTo = viaPreview ? `/preview/${previewCode}` : "/";

  if (!isBookingOpen() && !viaPreview) {
    redirect(`/?error=${encodeURIComponent("Booking hasn't opened yet.")}`);
  }

  const parsed = bookingSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    categoryId: formData.get("categoryId"),
    regionId: formData.get("regionId"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid submission";
    redirect(`${backTo}?error=${encodeURIComponent(message)}`);
  }

  const { name, mobile, categoryId, regionId, quantity } = parsed.data;

  const [category, region] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.region.findUnique({ where: { id: regionId } }),
  ]);
  if (!category || !region) {
    redirect(`${backTo}?error=${encodeURIComponent("Category or region no longer available")}`);
  }

  const ref = await generateBookingRef();

  await prisma.booking.create({
    data: {
      ref,
      name,
      mobile,
      quantity,
      categoryId,
      regionId,
      status: "PENDING",
    },
  });

  redirect(`/status?ref=${ref}&mobile=${mobile}&justSubmitted=1`);
}

const paymentSchema = z.object({
  ref: z.string().trim().min(1),
  mobile: z.string().trim().min(1),
  transactionDetails: z.string().trim().min(3, "Paste your transaction/UTR details").max(500),
});

const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024; // 6MB
const ALLOWED_SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function submitPayment(formData: FormData) {
  await expireStaleBookings();

  const parsed = paymentSchema.safeParse({
    ref: formData.get("ref"),
    mobile: formData.get("mobile"),
    transactionDetails: formData.get("transactionDetails"),
  });

  const ref = String(formData.get("ref") ?? "");
  const mobile = String(formData.get("mobile") ?? "");

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid submission";
    redirect(`/status?ref=${ref}&mobile=${mobile}&error=${encodeURIComponent(message)}`);
  }

  // Optional payment screenshot.
  let screenshotBytes: Uint8Array<ArrayBuffer> | null = null;
  let screenshotType: string | null = null;
  const screenshot = formData.get("screenshot");
  if (screenshot instanceof File && screenshot.size > 0) {
    if (!ALLOWED_SCREENSHOT_TYPES.includes(screenshot.type)) {
      redirect(
        `/status?ref=${ref}&mobile=${mobile}&error=${encodeURIComponent(
          "Screenshot must be an image (JPEG, PNG, WEBP, or HEIC)."
        )}`
      );
    }
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      redirect(
        `/status?ref=${ref}&mobile=${mobile}&error=${encodeURIComponent(
          "Screenshot is too large - please keep it under 6MB."
        )}`
      );
    }
    screenshotBytes = new Uint8Array(await screenshot.arrayBuffer());
    screenshotType = screenshot.type;
  }

  const { transactionDetails } = parsed.data;

  const booking = await prisma.booking.findFirst({ where: { ref, mobile } });
  if (!booking || booking.status !== "ALLOCATED") {
    redirect(
      `/status?ref=${ref}&mobile=${mobile}&error=${encodeURIComponent(
        "This booking is not awaiting payment right now."
      )}`
    );
  }

  await prisma.booking.update({
    where: { id: booking!.id },
    data: {
      status: "PAYMENT_SUBMITTED",
      transactionDetails,
      paymentSubmittedAt: new Date(),
      ...(screenshotBytes && {
        paymentScreenshot: screenshotBytes,
        paymentScreenshotType: screenshotType,
      }),
    },
  });

  redirect(`/status?ref=${ref}&mobile=${mobile}`);
}
