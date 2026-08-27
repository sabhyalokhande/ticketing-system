import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { expireStaleBookings } from "@/lib/expiry";
import { SeatPicker } from "@/components/SeatPicker";

export default async function AllocateSeatsPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  const { bookingId } = await params;

  await expireStaleBookings();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { category: true, region: true },
  });

  if (!booking) {
    redirect(`/admin?error=${encodeURIComponent("Booking not found")}`);
  }
  if (booking.status !== "PENDING") {
    redirect(
      `/admin?error=${encodeURIComponent(`Booking ${booking.ref} is no longer pending`)}`
    );
  }

  const seats = await prisma.seat.findMany({
    where: { categoryId: booking.categoryId },
    orderBy: { label: "asc" },
    select: { id: true, label: true, bookingId: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pick seats for {booking.ref}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {booking.name} &middot; {booking.mobile} &middot; {booking.category.name} &middot;{" "}
            {booking.region.name} &middot; needs {booking.quantity} seat(s)
          </p>
        </div>
        <Link href="/admin" className="btn-secondary shrink-0">
          Cancel
        </Link>
      </header>

      {seats.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No seats exist yet for {booking.category.name}. Add some from the dashboard first.
        </p>
      ) : (
        <SeatPicker
          bookingId={booking.id}
          quantity={booking.quantity}
          seats={seats.map((s) => ({ id: s.id, label: s.label, available: s.bookingId === null }))}
        />
      )}
    </main>
  );
}
