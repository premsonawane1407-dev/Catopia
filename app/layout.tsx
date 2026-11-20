import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catopia — a little world for campus cats",
  description:
    "A thoughtful home for the cats who make campus feel like home — and the people who notice them.",
};

export const viewport: Viewport = {
  themeColor: "#f5f0df",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
