import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Tiro_Devanagari_Marathi } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif for the invitation header (English lines).
const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

// Devanagari face for the Marathi title and quote on the invitation header.
const tiroMarathi = Tiro_Devanagari_Marathi({
  variable: "--font-marathi",
  weight: "400",
  subsets: ["devanagari", "latin"],
});

const SITE_URL = "https://ticketing-system-lime-zeta.vercel.app";
const TITLE = "Aamchya Pidhichi Goshtach Vegali - Tickets";
const DESCRIPTION = "Request, block, and pay for tickets to the play";

export const metadata: Metadata = {
  // Required for Next to turn the relative OG image path below into the
  // absolute URL that link-preview crawlers (WhatsApp, etc.) need.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: ["/Drama-Image.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/Drama-Image.jpeg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${tiroMarathi.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
