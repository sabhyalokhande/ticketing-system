import QRCode from "qrcode";
import { config } from "./config";

/**
 * Builds a UPI deep-link payment string and renders it as a data: URL PNG
 * that <img> tags can use directly - no external calls, no stored files.
 */
export async function generateUpiQrDataUrl(opts: {
  amount: number;
  note: string;
}): Promise<string> {
  const params = new URLSearchParams({
    pa: config.upiId, // payee address (UPI ID)
    pn: config.upiPayeeName, // payee name
    am: opts.amount.toFixed(2), // amount
    cu: "INR",
    tn: opts.note, // transaction note
  });
  const upiUrl = `upi://pay?${params.toString()}`;
  return QRCode.toDataURL(upiUrl, { margin: 1, width: 320 });
}
