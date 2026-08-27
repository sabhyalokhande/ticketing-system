import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { expireStaleBookings } from "@/lib/expiry";
import { StatusBadge } from "@/components/StatusBadge";
import { ShareLinkButtons } from "@/components/ShareLinkButtons";
import {
  adminLogout,
  rejectBooking,
  confirmPayment,
  updateCategoryPrice,
  addSeats,
  addRegion,
  deleteRegion,
} from "./actions";

const seatSelect = { seats: { select: { label: true }, orderBy: { label: "asc" as const } } };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  const { notice, error } = await searchParams;

  await expireStaleBookings();

  const [categories, regions, pending, allocated, paymentSubmitted, history, seatTotals, seatAvailable] =
    await Promise.all([
      prisma.category.findMany({ orderBy: { price: "desc" } }),
      prisma.region.findMany({ orderBy: { name: "asc" } }),
      prisma.booking.findMany({
        where: { status: "PENDING" },
        include: { category: true, region: true },
        orderBy: { createdAt: "asc" }, // first come, first served
      }),
      prisma.booking.findMany({
        where: { status: "ALLOCATED" },
        include: { category: true, region: true, ...seatSelect },
        orderBy: { expiresAt: "asc" },
      }),
      prisma.booking.findMany({
        where: { status: "PAYMENT_SUBMITTED" },
        include: { category: true, region: true, ...seatSelect },
        omit: { paymentScreenshot: true },
        orderBy: { paymentSubmittedAt: "asc" },
      }),
      prisma.booking.findMany({
        where: { status: { in: ["CONFIRMED", "REJECTED", "EXPIRED"] } },
        include: { category: true, region: true, ...seatSelect },
        omit: { paymentScreenshot: true },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.seat.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.seat.groupBy({ by: ["categoryId"], where: { bookingId: null }, _count: { _all: true } }),
    ]);

  const totalMap = new Map(seatTotals.map((s) => [s.categoryId, s._count._all]));
  const availableMap = new Map(seatAvailable.map((s) => [s.categoryId, s._count._all]));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Coordinator dashboard</h1>
        <form action={adminLogout}>
          <button type="submit" className="btn-secondary">
            Log out
          </button>
        </form>
      </header>

      {notice && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Pricing & seats */}
      <Section title="Categories, pricing & seats">
        <div className="flex flex-col gap-3">
          {categories.map((c) => {
            const total = totalMap.get(c.id) ?? 0;
            const available = availableMap.get(c.id) ?? 0;
            return (
              <div key={c.id} className="card flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <form action={updateCategoryPrice} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="categoryId" value={c.id} />
                    <span className="min-w-24 font-medium">{c.name}</span>
                    <label className="flex flex-col text-xs text-black/50 dark:text-white/50">
                      Price (₹)
                      <input
                        name="price"
                        type="number"
                        min={0}
                        defaultValue={c.price}
                        className="input w-28"
                      />
                    </label>
                    <button type="submit" className="btn-secondary">
                      Save price
                    </button>
                  </form>
                  <span className="ml-auto text-xs text-black/50 dark:text-white/50">
                    {total} seat(s) total &middot; {available} available
                  </span>
                </div>
                <form action={addSeats} className="flex items-end gap-3">
                  <input type="hidden" name="categoryId" value={c.id} />
                  <label className="flex flex-col text-xs text-black/50 dark:text-white/50">
                    Add seats
                    <input
                      name="count"
                      type="number"
                      min={1}
                      max={500}
                      defaultValue={10}
                      className="input w-24"
                    />
                  </label>
                  <button type="submit" className="btn-secondary">
                    Add
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Regions */}
      <Section title="Regions">
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <form key={r.id} action={deleteRegion.bind(null, r.id)}>
              <button
                type="submit"
                className="badge border border-black/15 hover:bg-red-50 hover:text-red-700 dark:border-white/20 dark:hover:bg-red-950 dark:hover:text-red-300"
                title="Remove region"
              >
                {r.name} &times;
              </button>
            </form>
          ))}
        </div>
        <form action={addRegion} className="mt-3 flex gap-2">
          <input name="name" placeholder="New region name" className="input" />
          <button type="submit" className="btn-secondary">
            Add
          </button>
        </form>
      </Section>

      {/* Pending */}
      <Section title={`Pending requests (${pending.length})`} subtitle="Oldest first — first come, first served">
        {pending.length === 0 ? (
          <Empty text="No pending requests." />
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center gap-3 text-sm">
                <BookingSummary booking={b} />
                <div className="ml-auto flex gap-2">
                  <Link href={`/admin/allocate/${b.id}`} className="btn-primary">
                    Allocate
                  </Link>
                  <RejectForm bookingId={b.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Allocated / awaiting payment */}
      <Section title={`Blocked — awaiting payment (${allocated.length})`}>
        {allocated.length === 0 ? (
          <Empty text="Nothing blocked right now." />
        ) : (
          <div className="flex flex-col gap-3">
            {allocated.map((b) => (
              <div key={b.id} className="card flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <BookingSummary booking={b} />
                  <span className="text-black/50 dark:text-white/50">₹{b.amountDue}</span>
                  {b.expiresAt && (
                    <span className="text-red-600 dark:text-red-400">
                      due by {b.expiresAt.toLocaleString()}
                    </span>
                  )}
                  <div className="ml-auto">
                    <RejectForm bookingId={b.id} />
                  </div>
                </div>
                <ShareLinkButtons
                  bookingRef={b.ref}
                  mobile={b.mobile}
                  name={b.name}
                  quantity={b.quantity}
                  categoryName={b.category.name}
                  amountDue={b.amountDue ?? 0}
                  deadlineText={b.expiresAt?.toLocaleString()}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Payment submitted */}
      <Section title={`Payment submitted — needs verification (${paymentSubmitted.length})`}>
        {paymentSubmitted.length === 0 ? (
          <Empty text="Nothing awaiting verification." />
        ) : (
          <div className="flex flex-col gap-2">
            {paymentSubmitted.map((b) => (
              <div key={b.id} className="card flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <BookingSummary booking={b} />
                  <span className="text-black/50 dark:text-white/50">₹{b.amountDue}</span>
                </div>
                <p className="rounded bg-black/5 px-2 py-1 font-mono text-xs dark:bg-white/10">
                  {b.transactionDetails}
                </p>
                {b.paymentScreenshotType && (
                  <a
                    href={`/api/bookings/${b.id}/screenshot`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/bookings/${b.id}/screenshot`}
                      alt="Payment screenshot"
                      className="h-40 w-fit rounded-lg border border-black/10 dark:border-white/15"
                    />
                  </a>
                )}
                <div className="flex gap-2 self-end">
                  <form action={confirmPayment.bind(null, b.id)}>
                    <button type="submit" className="btn-primary">
                      Confirm payment
                    </button>
                  </form>
                  <RejectForm bookingId={b.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* History */}
      <Section title="Recent history">
        {history.length === 0 ? (
          <Empty text="Nothing here yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center gap-3 text-sm">
                <BookingSummary booking={b} />
                {b.amountDue != null && (
                  <span className="text-black/50 dark:text-white/50">₹{b.amountDue}</span>
                )}
                {b.rejectionReason && (
                  <span className="text-black/50 dark:text-white/50">({b.rejectionReason})</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-black/50 dark:text-white/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-black/50 dark:text-white/50">{text}</p>;
}

function RejectForm({ bookingId }: { bookingId: string }) {
  return (
    <form action={rejectBooking} className="flex gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input name="reason" placeholder="Reason (optional)" className="input w-40 text-xs" />
      <button type="submit" className="btn-danger">
        Reject
      </button>
    </form>
  );
}

type BookingRow = {
  ref: string;
  name: string;
  mobile: string;
  quantity: number;
  status: string;
  createdAt: Date;
  category: { name: string };
  region: { name: string };
  seats?: { label: string }[];
};

function BookingSummary({ booking: b }: { booking: BookingRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono font-medium">{b.ref}</span>
      <StatusBadge status={b.status} />
      <span>{b.name}</span>
      <span className="text-black/50 dark:text-white/50">{b.mobile}</span>
      <span>
        {b.quantity}&times; {b.category.name}
      </span>
      <span className="text-black/50 dark:text-white/50">{b.region.name}</span>
      {b.seats && b.seats.length > 0 && (
        <span className="font-mono text-xs text-black/50 dark:text-white/50">
          {b.seats.map((s) => s.label).join(", ")}
        </span>
      )}
      <span className="text-xs text-black/40 dark:text-white/40">
        {b.createdAt.toLocaleString()}
      </span>
    </div>
  );
}
