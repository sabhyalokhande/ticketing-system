import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { expireStaleBookings } from "@/lib/expiry";
import { formatDateIST, formatDateTimeIST } from "@/lib/date";
import { getPaymentWindow } from "@/lib/settings";
import { StatusBadge } from "@/components/StatusBadge";
import { ShareLinkButtons } from "@/components/ShareLinkButtons";
import { DeleteBookingButton } from "@/components/DeleteBookingButton";
import { PaymentWindowForm } from "@/components/PaymentWindowForm";
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

  const [
    paymentWindow,
    categories,
    regions,
    pending,
    allocated,
    paymentSubmitted,
    confirmedCount,
    history,
    seatTotals,
    seatAvailable,
    allSeats,
  ] =
    await Promise.all([
      getPaymentWindow(),
      prisma.category.findMany({ orderBy: { price: "desc" } }),
      prisma.region.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
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
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.findMany({
        where: { status: { in: ["CONFIRMED", "REJECTED", "EXPIRED"] } },
        include: { category: true, region: true, ...seatSelect },
        omit: { paymentScreenshot: true },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.seat.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.seat.groupBy({ by: ["categoryId"], where: { bookingId: null }, _count: { _all: true } }),
      prisma.seat.findMany({
        select: { id: true, label: true, categoryId: true, booking: { select: { ref: true } } },
        orderBy: { label: "asc" },
      }),
    ]);

  const totalMap = new Map(seatTotals.map((s) => [s.categoryId, s._count._all]));
  const availableMap = new Map(seatAvailable.map((s) => [s.categoryId, s._count._all]));
  const seatsByCategory = new Map<string, typeof allSeats>();
  for (const s of allSeats) {
    if (!seatsByCategory.has(s.categoryId)) seatsByCategory.set(s.categoryId, []);
    seatsByCategory.get(s.categoryId)!.push(s);
  }

  const totalSeats = seatTotals.reduce((sum, s) => sum + s._count._all, 0);
  const availableSeats = seatAvailable.reduce((sum, s) => sum + s._count._all, 0);
  const seatsGivenOut = totalSeats - availableSeats;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Coordinator dashboard</h1>
        <form action={adminLogout}>
          <button type="submit" className="btn-secondary">
            Log out
          </button>
        </form>
      </header>

      {/* At-a-glance counts - the full pipeline, and how much inventory is left */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard accent="amber" label="Pending" count={pending.length} />
        <StatCard accent="blue" label="Blocked — awaiting payment" count={allocated.length} />
        <StatCard accent="purple" label="Needs verification" count={paymentSubmitted.length} />
        <StatCard accent="green" label="Payment confirmed" count={confirmedCount} />
        <StatCard accent="gray" label="Seats allocated" count={seatsGivenOut} total={totalSeats} />
      </div>

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

      {/* Action queue - the day-to-day work */}
      <div className="flex flex-col gap-6">
        <Disclosure
          accent="amber"
          title={`Pending requests (${pending.length})`}
          subtitle="Oldest first — first come, first served"
        >
          {pending.length === 0 ? (
            <Empty text="No pending requests." />
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((b) => (
                <div
                  key={b.id}
                  className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <BookingSummary booking={b} />
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Link href={`/admin/allocate/${b.id}`} className="btn-primary">
                      Allocate
                    </Link>
                    <RejectForm bookingId={b.id} />
                    <DeleteBookingButton bookingId={b.id} bookingRef={b.ref} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Disclosure>

        <Section accent="blue" title={`Blocked — awaiting payment (${allocated.length})`}>
          {allocated.length === 0 ? (
            <Empty text="Nothing blocked right now." />
          ) : (
            <div className="flex flex-col gap-3">
              {allocated.map((b) => (
                <div key={b.id} className="card flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                      <BookingSummary booking={b} />
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">₹{b.amountDue}</span>
                        {b.expiresAt && (
                          <span className="text-red-600 dark:text-red-400">
                            due by {formatDateTimeIST(b.expiresAt)} IST
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                      <RejectForm bookingId={b.id} />
                      <DeleteBookingButton bookingId={b.id} bookingRef={b.ref} />
                    </div>
                  </div>
                  <ShareLinkButtons
                    bookingRef={b.ref}
                    mobile={b.mobile}
                    amountDue={b.amountDue ?? 0}
                    deadlineText={b.expiresAt ? formatDateIST(b.expiresAt) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section accent="purple" title={`Payment submitted — needs verification (${paymentSubmitted.length})`}>
          {paymentSubmitted.length === 0 ? (
            <Empty text="Nothing awaiting verification." />
          ) : (
            <div className="flex flex-col gap-3">
              {paymentSubmitted.map((b) => (
                <div key={b.id} className="card flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                      <BookingSummary booking={b} />
                      <span className="text-sm font-medium">₹{b.amountDue}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                      <form action={confirmPayment.bind(null, b.id)}>
                        <button type="submit" className="btn-primary">
                          Confirm payment
                        </button>
                      </form>
                      <RejectForm bookingId={b.id} />
                      <DeleteBookingButton bookingId={b.id} bookingRef={b.ref} />
                    </div>
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
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Configuration - set-and-forget, tucked away so it doesn't crowd the queues above */}
      <Disclosure title="⚙️ Settings" subtitle="Payment window, pricing & seats, residence areas">
        <div className="flex flex-col gap-8">
          <Section
            title="Payment window"
            subtitle="How long a blocked booking has to pay before it auto-expires"
          >
            <PaymentWindowForm holdMode={paymentWindow.holdMode} holdHours={paymentWindow.holdHours} />
          </Section>

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

                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80">
                        View auditorium seat map
                      </summary>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-black/60 dark:text-white/60">
                        <Legend swatch="border border-black/20 dark:border-white/30" label="Available" />
                        <Legend swatch="bg-black/10 dark:bg-white/10" label="Taken" />
                      </div>
                      <div className="mt-2 flex max-h-96 flex-col gap-1.5 overflow-y-auto">
                        {groupSeatsByRow(seatsByCategory.get(c.id) ?? []).map(({ row, seats: rowSeats }) => (
                          <div key={row} className="flex items-start gap-2">
                            <span className="w-6 shrink-0 pt-1 text-right font-mono text-[10px] text-black/40 dark:text-white/40">
                              {row}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {rowSeats.map((s) => (
                                <span
                                  key={s.id}
                                  title={s.booking ? `${s.label} — ${s.booking.ref}` : `${s.label} — available`}
                                  className={[
                                    "rounded px-1 py-1.5 text-center font-mono text-[10px]",
                                    s.booking
                                      ? "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
                                      : "border border-black/20 dark:border-white/30",
                                  ].join(" ")}
                                >
                                  {s.label.slice(s.label.lastIndexOf("-") + 1)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Residence Areas">
            <div className="flex flex-wrap gap-2">
              {regions.map((r) => (
                <form key={r.id} action={deleteRegion.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="badge border border-black/15 hover:bg-red-50 hover:text-red-700 dark:border-white/20 dark:hover:bg-red-950 dark:hover:text-red-300"
                    title="Remove residence area"
                  >
                    {r.name} &times;
                  </button>
                </form>
              ))}
            </div>
            <form action={addRegion} className="mt-3 flex gap-2">
              <input name="name" placeholder="New residence area name" className="input" />
              <button type="submit" className="btn-secondary">
                Add
              </button>
            </form>
          </Section>
        </div>
      </Disclosure>

      {/* History - reference only, collapsed so it doesn't push the working queues down */}
      <Disclosure title="🕘 Recent history" subtitle={`Last ${history.length} confirmed, rejected, or expired`}>
        {history.length === 0 ? (
          <Empty text="Nothing here yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((b) => (
              <div key={b.id} className="card flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <BookingSummary booking={b} />
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {b.amountDue != null && (
                      <span className="text-black/50 dark:text-white/50">₹{b.amountDue}</span>
                    )}
                    {b.rejectionReason && (
                      <span className="text-black/50 dark:text-white/50">({b.rejectionReason})</span>
                    )}
                    <DeleteBookingButton bookingId={b.id} bookingRef={b.ref} />
                  </div>
                </div>
                {b.status === "CONFIRMED" && (
                  <ShareLinkButtons
                    bookingRef={b.ref}
                    mobile={b.mobile}
                    amountDue={b.amountDue ?? 0}
                    variant="ticket"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Disclosure>
    </main>
  );
}

type Accent = "amber" | "blue" | "purple" | "green" | "gray";

const ACCENT_DOT: Record<Accent, string> = {
  amber: "bg-amber-400",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  gray: "bg-gray-400",
};

const ACCENT_CARD: Record<Accent, string> = {
  amber: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  blue: "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
  purple: "border-purple-300 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40",
  green: "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
  gray: "border-black/15 bg-black/[0.03] dark:border-white/15 dark:bg-white/5",
};

function StatCard({
  accent,
  label,
  count,
  total,
}: {
  accent: Accent;
  label: string;
  count: number;
  /** When given, renders as "count / total" (e.g. seats given out of the pool). */
  total?: number;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${ACCENT_CARD[accent]}`}>
      <div className="text-2xl font-semibold text-black dark:text-white">
        {count}
        {total != null && <span className="text-base font-normal text-black/40 dark:text-white/40"> / {total}</span>}
      </div>
      <div className="text-xs text-black/60 dark:text-white/60">{label}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: Accent;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {accent && <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${ACCENT_DOT[accent]}`} />}
          {title}
        </h2>
        {subtitle && <p className="text-xs text-black/50 dark:text-white/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// A collapsed-by-default group for content that isn't part of the daily
// queue (configuration, history) - keeps it one click away instead of
// permanently taking up scroll space above the things that actually need
// action today.
function Disclosure({
  title,
  subtitle,
  accent,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: Accent;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-black/10 dark:border-white/15"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <span className="flex items-center gap-2 text-base font-semibold">
            {accent && <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${ACCENT_DOT[accent]}`} />}
            {title}
          </span>
          {subtitle && (
            <p className="text-xs font-normal text-black/50 dark:text-white/50">{subtitle}</p>
          )}
        </div>
        <span aria-hidden className="text-black/40 transition-transform group-open:rotate-90 dark:text-white/40">
          &rsaquo;
        </span>
      </summary>
      <div className="flex flex-col gap-8 border-t border-black/10 px-4 py-5 dark:border-white/15">
        {children}
      </div>
    </details>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-black/50 dark:text-white/50">{text}</p>;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${swatch}`} />
      {label}
    </span>
  );
}

/** Groups a flat, label-sorted seat list ("A-01", "A-02", ...) into one entry per row letter. */
function groupSeatsByRow<T extends { label: string }>(seats: T[]): { row: string; seats: T[] }[] {
  const byRow = new Map<string, T[]>();
  const order: string[] = [];
  for (const seat of seats) {
    const i = seat.label.lastIndexOf("-");
    const row = i === -1 ? seat.label : seat.label.slice(0, i);
    if (!byRow.has(row)) {
      byRow.set(row, []);
      order.push(row);
    }
    byRow.get(row)!.push(seat);
  }
  return order.map((row) => ({ row, seats: byRow.get(row)! }));
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
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-medium">{b.ref}</span>
        <StatusBadge status={b.status} />
        <span className="font-medium">{b.name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-black/50 dark:text-white/50">
        <span>{b.mobile}</span>
        <span aria-hidden>&middot;</span>
        <span>
          {b.quantity}&times; {b.category.name}
        </span>
        <span aria-hidden>&middot;</span>
        <span>{b.region.name}</span>
        {b.seats && b.seats.length > 0 && (
          <>
            <span aria-hidden>&middot;</span>
            <span className="font-mono">{b.seats.map((s) => s.label).join(", ")}</span>
          </>
        )}
        <span aria-hidden>&middot;</span>
        <span>{formatDateTimeIST(b.createdAt)} IST</span>
      </div>
    </div>
  );
}
