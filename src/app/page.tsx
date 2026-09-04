import { isBookingOpen } from "@/lib/config";
import {
  BookingPortal,
  Poster,
  TrailerButton,
  EventDetailsCard,
} from "@/components/BookingPortal";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!isBookingOpen()) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-5 px-4 py-10 text-center">
        <div className="w-full whitespace-nowrap rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100">
          Booking will start from 5th September 2026, 9:00 AM
        </div>

        <Poster />
        <TrailerButton />
        <EventDetailsCard />

        <div className="card w-full text-center text-sm">
          <p className="font-medium">Booking hasn&apos;t opened yet.</p>
          <p className="mt-1 text-black/60 dark:text-white/60">
            Come back on 5th September 2026, 9:00 AM to request tickets.
          </p>
        </div>
      </main>
    );
  }

  return <BookingPortal error={error} />;
}
