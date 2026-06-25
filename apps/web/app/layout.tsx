import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Team Manager",
  description: "Local command center for AI coding agents"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

