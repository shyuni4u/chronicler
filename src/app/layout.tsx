import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronicler",
  description: "Multi-agent novel writing system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
