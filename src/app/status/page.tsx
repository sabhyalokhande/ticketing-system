import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { expireStaleBookings } from "@/lib/expiry";
import { formatDateTimeIST } from "@/lib/date";
import { generateUpiQrDataUrl } from "@/lib/qr";
import { StatusBadge } from "@/components/StatusBadge";
import { submitPayment } from "../actions";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    mobile?: string;
    error?: string;
    justSubmitted?: string;
  }>;
}) {
  const { ref, mobile, error, justSubmitted } = await searchParams;

  if (!ref || !mobile) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Check status</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Enter your booking reference and the mobile number you used to submit it.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <form method="get" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Booking reference
            <input name="ref" required placeholder="TKT-XXXXXX" className="input uppercase" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Mobile number
            <input
              name="mobile"
              required
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              className="input"
            />
          </label>
          <button type="submit" className="btn-primary mt-2">
            Check status
          </button>
        </form>

        <Link href="/" className="text-center text-sm underline">
          Back to new request
        </Link>
      </main>
    );
  }

  await expireStaleBookings();

  const booking = await prisma.booking.findFirst({
    where: { ref: ref.trim().toUpperCase(), mobile: mobile.trim() },
    include: { category: true, region: true, seats: { select: { label: true }, orderBy: { label: "asc" } } },
    // The screenshot itself can be several MB - never pull it into a page render.
    omit: { paymentScreenshot: true },
  });

  if (!booking) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          No booking matches that reference and mobile number. Double-check both and try again.
        </p>
        <Link href="/status" className="btn-secondary w-fit">
          Try again
        </Link>
      </main>
    );
  }

  const qrDataUrl =
    booking.status === "ALLOCATED" && booking.amountDue
      ? await generateUpiQrDataUrl({
          amount: booking.amountDue,
          note: `${booking.ref} ${booking.category.name}`,
        })
      : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Booking {booking.ref}</h1>
        <StatusBadge status={booking.status} />
      </header>

      {justSubmitted === "1" && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <p className="font-semibold">Thanks for Booking your tickets!</p>
          <p className="mt-1">
            You&apos;ll get your allocated seats and payment link within 2 working days on your
            WhatsApp number.
          </p>
          <p className="mt-2">
            Save this reference:{" "}
            <span className="font-mono font-semibold">{booking.ref}</span>. Bookmark this page or
            revisit <span className="font-mono">/status</span> with your ref + mobile to check
            progress.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="card grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-black/50 dark:text-white/50">Name</span>
        <span>{booking.name}</span>
        <span className="text-black/50 dark:text-white/50">Category</span>
        <span>{booking.category.name}</span>
        <span className="text-black/50 dark:text-white/50">Residence Area</span>
        <span>{booking.region.name}</span>
        <span className="text-black/50 dark:text-white/50">Tickets</span>
        <span>{booking.quantity}</span>
        {booking.seats.length > 0 && (
          <>
            <span className="text-black/50 dark:text-white/50">Seats</span>
            <span className="font-mono">{booking.seats.map((s) => s.label).join(", ")}</span>
          </>
        )}
        {booking.amountDue != null && (
          <>
            <span className="text-black/50 dark:text-white/50">Amount</span>
            <span>₹{booking.amountDue}</span>
          </>
        )}
      </div>

      {booking.status === "PENDING" && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Waiting for the coordinator to check availability and allocate your tickets. No need to
          call &mdash; just check back here.
        </p>
      )}

      {booking.status === "ALLOCATED" && (
        <div className="card flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">
              Pay ₹{booking.amountDue} within {booking.expiresAt ? "the deadline below" : "24 hours"}{" "}
              to confirm your tickets.
            </p>
            {booking.expiresAt && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Deadline: {formatDateTimeIST(booking.expiresAt)} IST
              </p>
            )}
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-sm font-medium text-amber-700 dark:text-amber-400">
                Scan the QR code from another device for a successful payment.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="UPI payment QR code" className="h-64 w-64" />
            </div>
          )}

          {config.bankName && (
            <div className="rounded-lg bg-black/5 px-4 py-3 text-sm dark:bg-white/10">
              <p className="mb-2 font-medium">Or pay by bank transfer</p>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <span className="text-black/50 dark:text-white/50">Bank Name</span>
                <span>{config.bankName}</span>
                <span className="text-black/50 dark:text-white/50">Bank location</span>
                <span>{config.bankLocation}</span>
                <span className="text-black/50 dark:text-white/50">Bank A/c number</span>
                <span className="font-mono">{config.bankAccountNumber}</span>
                <span className="text-black/50 dark:text-white/50">IFSC code</span>
                <span className="font-mono">{config.bankIfsc}</span>
              </div>
            </div>
          )}

          <form action={submitPayment} className="flex flex-col gap-3">
            <input type="hidden" name="ref" value={booking.ref} />
            <input type="hidden" name="mobile" value={booking.mobile} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Transaction / UTR details
              <textarea
                name="transactionDetails"
                required
                minLength={3}
                maxLength={500}
                rows={3}
                placeholder="Paste your UPI transaction ID / reference number here after paying"
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Payment screenshot (optional)
              <input
                name="screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="input file:mr-3 file:rounded file:border-0 file:bg-black/10 file:px-2 file:py-1 file:text-xs dark:file:bg-white/10"
              />
            </label>
            <button type="submit" className="btn-primary">
              Submit payment details
            </button>
          </form>
        </div>
      )}

      {booking.status === "PAYMENT_SUBMITTED" && (
        <div className="card flex flex-col gap-2 text-sm">
          <p>Your payment details were submitted and are awaiting verification.</p>
          <p className="text-black/50 dark:text-white/50">
            Submitted transaction details: <span className="font-mono">{booking.transactionDetails}</span>
          </p>
          {booking.paymentScreenshotType && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/bookings/${booking.id}/screenshot`}
              alt="Uploaded payment screenshot"
              className="max-h-80 w-fit rounded-lg border border-black/10 dark:border-white/15"
            />
          )}
        </div>
      )}

      {booking.status === "CONFIRMED" && (
        <div className="card flex flex-col gap-3 text-sm">
          <p>
            Payment verified &mdash; your {booking.quantity} ticket(s) are confirmed. Keep this
            reference ({booking.ref}) handy.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/bookings/${booking.id}/ticket`}
            alt="Your ticket"
            className="w-full rounded-lg border border-black/10 dark:border-white/15"
          />
          <a
            href={`/api/bookings/${booking.id}/ticket`}
            download={`${booking.ref}-ticket.png`}
            className="btn-secondary text-center"
          >
            Download ticket
          </a>
          <p className="text-xs text-black/50 dark:text-white/50">
            Save this image or take a screenshot &mdash; show it at entry.
          </p>
        </div>
      )}

      {booking.status === "REJECTED" && (
        <div className="card text-sm">
          This request was declined by the coordinator
          {booking.rejectionReason ? `: ${booking.rejectionReason}` : "."}
        </div>
      )}

      {booking.status === "EXPIRED" && (
        <div className="card flex flex-col gap-3 text-sm">
          <p>The 24-hour payment window passed before payment was submitted, so the hold was released.</p>
          <Link href="/" className="btn-secondary w-fit">
            Submit a new request
          </Link>
        </div>
      )}

      <Link href="/status" className="text-center text-xs underline">
        Check a different booking
      </Link>
    </main>
  );
}
