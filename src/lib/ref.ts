import { randomInt } from "crypto";
import { prisma } from "./prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

function randomCode(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Generates a short, human-friendly, unique booking reference like TKT-7F3K9Q. */
export async function generateBookingRef(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ref = `TKT-${randomCode(6)}`;
    const existing = await prisma.booking.findUnique({ where: { ref } });
    if (!existing) return ref;
  }
  throw new Error("Could not generate a unique booking reference, please retry.");
}
