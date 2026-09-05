import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

// Serves a generated ticket image for a CONFIRMED booking. Gated only by
// knowing the booking's internal id (an unguessable cuid), same access
// model as the payment-screenshot route.

let posterDataUriPromise: Promise<string> | null = null;
function getPosterDataUri() {
  if (!posterDataUriPromise) {
    posterDataUriPromise = readFile(join(process.cwd(), "public", "main-img.jpeg")).then(
      (buf) => `data:image/jpeg;base64,${buf.toString("base64")}`
    );
  }
  return posterDataUriPromise;
}

// KME/LMP logos (pre-cropped from the combined public/logos.png - see
// BookingPortal's invite header) shown at the top-left of the ticket.
let logoDataUrisPromise: Promise<{ kme: string; lmp: string } | null> | null = null;
function getLogoDataUris() {
  if (!logoDataUrisPromise) {
    logoDataUrisPromise = Promise.all([
      readFile(join(process.cwd(), "public", "logo-kme.png")),
      readFile(join(process.cwd(), "public", "logo-lmp.png")),
    ])
      .then(([kme, lmp]) => ({
        kme: `data:image/png;base64,${kme.toString("base64")}`,
        lmp: `data:image/png;base64,${lmp.toString("base64")}`,
      }))
      .catch(() => null); // logos not added yet - ticket still renders fine without them
  }
  return logoDataUrisPromise;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", width: "100%", padding: "8px 0" }}>
      <div style={{ display: "flex", width: 196, color: "#92867a", fontSize: 25 }}>{label}</div>
      <div style={{ display: "flex", flex: 1, color: "#2b241c", fontSize: 25, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

// Compact counterfoil version of Row, for the tear-off stub on the left -
// same info as the main ticket, just condensed, the way a cheque or old
// cinema ticket keeps a matching record stub.
function StubRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "5px 0" }}>
      <div style={{ display: "flex", color: "#92867a", fontSize: 13 }}>{label}</div>
      <div style={{ display: "flex", color: "#2b241c", fontSize: 15, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { category: true, seats: { select: { label: true }, orderBy: { label: "asc" } } },
  });

  if (!booking || booking.status !== "CONFIRMED") {
    return new Response("Ticket not available", { status: 404 });
  }

  const poster = await getPosterDataUri();
  const logos = await getLogoDataUris();
  const seatLabels = booking.seats.map((s) => s.label).join(", ") || "—";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#fffaf3",
          fontFamily: "sans-serif",
        }}
      >
        {/* Counterfoil stub - same details as the main ticket, condensed,
            like the tear-off left half of a cheque or old cinema ticket. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 260,
            padding: "28px 22px",
            borderRight: "3px dashed #d8cdbd",
          }}
        >
          {logos && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logos.kme} alt="" width={110} height={21} style={{ objectFit: "contain" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logos.lmp} alt="" width={30} height={28} style={{ objectFit: "contain" }} />
            </div>
          )}
          <div style={{ display: "flex", fontSize: 15, color: "#92867a" }}>NO. {booking.ref}</div>
          <div
            style={{
              display: "flex",
              fontSize: 13,
              fontWeight: 700,
              color: "#c2410c",
              marginTop: 8,
            }}
          >
            Konkan Maratha Melava 2026
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              color: "#2b241c",
              marginTop: 4,
              lineHeight: 1.25,
            }}
          >
            Aamchya Pidhichi Goshtach Vegali
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
            <StubRow label="Date" value="25 Oct 2026" />
            <StubRow label="Venue" value="Mahakavi Kalidas Natyamandir" />
            <StubRow label="Event" value="10:00 AM onwards" />
            <StubRow label="Grand Drama" value="4:00 PM" />
            <StubRow label="Rate" value={`Rs ${booking.category.price}`} />
            <StubRow label="Seat" value={seatLabels} />
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt="Play poster"
          width={364}
          height={644}
          style={{ objectFit: "cover", borderRight: "6px dashed #d8cdbd" }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "39px 50px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                background: "#c2410c",
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
                padding: "8px 20px",
                borderRadius: 8,
              }}
            >
              TICKET
            </div>
            <div style={{ display: "flex", fontSize: 25, color: "#92867a" }}>
              No. {booking.ref}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 31, gap: 8 }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: "#c2410c",
              }}
            >
              Konkan Maratha Melava 2026
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                color: "#2b241c",
              }}
            >
              Aamchya Pidhichi Goshtach Vegali
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              height: 3,
              background: "#e8ddcb",
              margin: "25px 0",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <Row label="Name" value={booking.name} />
            <Row label="Category" value={booking.category.name} />
            <Row label="Seats" value={seatLabels} />
            <Row label="Date" value="Sunday, 25 October 2026" />
            <Row label="Event" value="10:00 AM onwards" />
            <Row label="Grand Drama" value="4:00 PM" />
            <Row label="Venue" value="Mahakavi Kalidas Natyamandir, Mulund (West), Mumbai" />
            <Row label="Amount Paid" value={`Rs ${booking.amountDue ?? 0}`} />
          </div>
        </div>
      </div>
    ),
    { width: 1660, height: 644 }
  );
}
