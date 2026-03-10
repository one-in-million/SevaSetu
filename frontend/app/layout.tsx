import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SevaSetu — Your Bridge to Government Benefits",
  description:
    "SevaSetu uses advanced AI to match you with 3,400+ government schemes across India. Get personalized eligibility checks, document guidance, and direct answers — instantly.",
  keywords: "government schemes, India, eligibility, AI, benefits, SevaSetu",
  openGraph: {
    title: "SevaSetu — Your Bridge to Government Benefits",
    description:
      "Discover government schemes you're eligible for — powered by 120B agentic AI.",
    siteName: "SevaSetu",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
