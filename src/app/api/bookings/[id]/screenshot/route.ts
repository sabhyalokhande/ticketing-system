import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serves an uploaded payment screenshot. Gated only by knowing the booking's
// internal id (an unguessable cuid, not the human-facing ref) - consistent
// with the rest of the app's "possession of the right identifiers" access
// model rather than a full auth system.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { paymentScreenshot: true, paymentScreenshotType: true },
  });

  if (!booking?.paymentScreenshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(booking.paymentScreenshot), {
    headers: {
      "Content-Type": booking.paymentScreenshotType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
