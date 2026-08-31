"use client";

import { useState } from "react";

type Props = {
  bookingRef: string;
  mobile: string;
  amountDue: number;
  deadlineText?: string;
  /** "payment" (default): payment-reminder message. "ticket": ready-ticket message. */
  variant?: "payment" | "ticket";
};

function buildLink(ref: string, mobile: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/status?ref=${ref}&mobile=${mobile}`;
}

function buildMessage(props: Props) {
  const link = buildLink(props.bookingRef, props.mobile);
  if (props.variant === "ticket") {
    return `Your tickets are confirmed! View/download your ticket here: ${link}`;
  }
  const deadline = props.deadlineText ? `latest by ${props.deadlineText}` : "within 24 hours";
  return `Please pay ₹${props.amountDue} and submit your payment details here ${deadline}: ${link}\n\nIn case of failure to make payment, the allocated tickets will be cancelled and the allocated seats will be free for other bookings.`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareLinkButtons(props: Props) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  function flash(which: "link" | "message") {
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  async function onCopyLink() {
    if (await copy(buildLink(props.bookingRef, props.mobile))) flash("link");
  }

  async function onCopyMessage() {
    if (await copy(buildMessage(props))) flash("message");
  }

  function onWhatsApp() {
    const text = encodeURIComponent(buildMessage(props));
    window.open(`https://wa.me/91${props.mobile}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onCopyLink} className="btn-secondary text-xs">
        {copied === "link" ? "Copied!" : "Copy link"}
      </button>
      <button type="button" onClick={onCopyMessage} className="btn-secondary text-xs">
        {copied === "message" ? "Copied!" : "Copy link + message"}
      </button>
      <button
        type="button"
        onClick={onWhatsApp}
        className="btn-secondary text-xs text-green-700 dark:text-green-400"
      >
        {props.variant === "ticket" ? "Send ticket on WhatsApp" : "Send on WhatsApp"}
      </button>
    </div>
  );
}
