"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin, destroyAdminSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { expireStaleBookings } from "@/lib/expiry";
import { addSeatsToCategory } from "@/lib/seats";

async function requireAdmin() {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }
}

function withNotice(message: string, ok = true): never {
  const key = ok ? "notice" : "error";
  redirect(`/admin?${key}=${encodeURIComponent(message)}`);
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

/**
 * Allocates a pending request onto specific, coordinator-picked seats.
 * Returns an error object instead of redirecting on failure, since this is
 * called directly from the seat-picker client component (not a plain
 * form post) and needs to show the error inline without navigating away.
 */
export async function allocateBookingWithSeats(
  bookingId: string,
  seatIds: string[]
): Promise<{ ok: false; error: string } | never> {
  await requireAdmin();
  await expireStaleBookings();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { category: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status !== "PENDING") {
    return { ok: false, error: `Booking ${booking.ref} is no longer pending` };
  }

  const uniqueSeatIds = Array.from(new Set(seatIds));
  if (uniqueSeatIds.length !== booking.quantity) {
    return {
      ok: false,
      error: `Select exactly ${booking.quantity} seat(s) - you picked ${uniqueSeatIds.length}`,
    };
  }

  const seats = await prisma.seat.findMany({ where: { id: { in: uniqueSeatIds } } });
  const allStillFree = seats.every(
    (s) => s.categoryId === booking.categoryId && s.bookingId === null
  );
  if (seats.length !== uniqueSeatIds.length || !allStillFree) {
    return {
      ok: false,
      error: "One or more selected seats were just taken or are invalid - please reselect",
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.holdHours * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.seat.updateMany({
      where: { id: { in: uniqueSeatIds } },
      data: { bookingId: booking.id },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "ALLOCATED",
        amountDue: booking.category.price * booking.quantity,
        allocatedAt: now,
        expiresAt,
      },
    }),
  ]);

  withNotice(
    `Blocked ${booking.quantity} seat(s) for ${booking.ref}. Payment window: ${config.holdHours}h.`
  );
}

const rejectSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().trim().max(300).optional(),
});

export async function rejectBooking(formData: FormData) {
  await requireAdmin();
  const parsed = rejectSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return withNotice("Invalid request", false);

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) return withNotice("Booking not found", false);
  if (["CONFIRMED", "REJECTED", "EXPIRED"].includes(booking.status)) {
    return withNotice(`Booking ${booking.ref} is already ${booking.status.toLowerCase()}`, false);
  }

  await prisma.$transaction([
    prisma.seat.updateMany({ where: { bookingId: booking.id }, data: { bookingId: null } }),
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: parsed.data.reason ?? null,
      },
    }),
  ]);
  return withNotice(`Rejected ${booking.ref}`);
}

/** Permanently deletes a booking (any status), freeing any seats it held. */
export async function deleteBooking(bookingId: string) {
  await requireAdmin();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return withNotice("Booking not found", false);

  await prisma.$transaction([
    prisma.seat.updateMany({ where: { bookingId: booking.id }, data: { bookingId: null } }),
    prisma.booking.delete({ where: { id: booking.id } }),
  ]);
  return withNotice(`Deleted ${booking.ref}`);
}

export async function confirmPayment(bookingId: string) {
  await requireAdmin();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return withNotice("Booking not found", false);
  if (booking.status !== "PAYMENT_SUBMITTED") {
    return withNotice(`Booking ${booking.ref} has no payment awaiting verification`, false);
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  return withNotice(`Confirmed ${booking.ref}. Tickets finalized.`);
}

const updatePriceSchema = z.object({
  categoryId: z.string().min(1),
  price: z.coerce.number().int().min(0),
});

export async function updateCategoryPrice(formData: FormData) {
  await requireAdmin();
  const parsed = updatePriceSchema.safeParse({
    categoryId: formData.get("categoryId"),
    price: formData.get("price"),
  });
  if (!parsed.success) return withNotice("Invalid price", false);

  const category = await prisma.category.update({
    where: { id: parsed.data.categoryId },
    data: { price: parsed.data.price },
  });
  return withNotice(`Updated ${category.name}: ₹${category.price}/ticket`);
}

const addSeatsSchema = z.object({
  categoryId: z.string().min(1),
  count: z.coerce.number().int().min(1).max(500),
});

export async function addSeats(formData: FormData) {
  await requireAdmin();
  const parsed = addSeatsSchema.safeParse({
    categoryId: formData.get("categoryId"),
    count: formData.get("count"),
  });
  if (!parsed.success) return withNotice("Invalid seat count", false);

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return withNotice("Category not found", false);

  await addSeatsToCategory(category.id, parsed.data.count);
  return withNotice(`Added ${parsed.data.count} seat(s) to ${category.name}`);
}

const addRegionSchema = z.object({
  name: z.string().trim().min(1, "Enter a region name").max(50),
});

export async function addRegion(formData: FormData) {
  await requireAdmin();
  const parsed = addRegionSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return withNotice(parsed.error.issues[0]?.message ?? "Invalid region", false);

  const existing = await prisma.region.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    if (existing.active) {
      return withNotice(`Region "${parsed.data.name}" already exists`, false);
    }
    // Name matches a previously-retired region - bring it back rather than
    // fail on the unique constraint.
    await prisma.region.update({ where: { id: existing.id }, data: { active: true } });
    return withNotice(`Re-activated region ${parsed.data.name}`);
  }
  await prisma.region.create({ data: { name: parsed.data.name } });
  return withNotice(`Added region ${parsed.data.name}`);
}

export async function deleteRegion(regionId: string) {
  await requireAdmin();
  const inUse = await prisma.booking.count({ where: { regionId } });
  if (inUse > 0) {
    // Can't hard-delete without breaking those bookings' foreign key -
    // retire it instead so it just disappears from future pickers.
    await prisma.region.update({ where: { id: regionId }, data: { active: false } });
    return withNotice("Region has existing bookings, so it was retired (hidden) rather than deleted");
  }
  await prisma.region.delete({ where: { id: regionId } });
  return withNotice("Region removed");
}
