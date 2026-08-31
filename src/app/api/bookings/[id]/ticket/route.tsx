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
    posterDataUriPromise = readFile(join(process.cwd(), "public", "Drama-Image.jpeg")).then(
      (buf) => `data:image/jpeg;base64,${buf.toString("base64")}`
    );
  }
  return posterDataUriPromise;
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

          <div style={{ display: "flex", flexDirection: "column", marginTop: 31, gap: 14 }}>
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
            <div style={{ display: "flex", fontSize: 22, color: "#92867a" }}>
              Konkan Maratha Melava 2026
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
            <Row label="Time" value="4:00 PM" />
            <Row label="Venue" value="Kalidasa Natyamandir, Mulund (West), Mumbai" />
            <Row label="Amount Paid" value={`Rs ${booking.amountDue ?? 0}`} />
          </div>
        </div>
      </div>
    ),
    { width: 1400, height: 644 }
  );
}
