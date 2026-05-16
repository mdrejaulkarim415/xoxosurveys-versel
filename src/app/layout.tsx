import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XoXoSurveys - Earn money with paid online surveys",
  description:
    "Complete surveys and redeem your earnings through PayPal, Amazon, and more.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${outfit.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
