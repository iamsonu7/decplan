import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Journey HQ",
  description: "Personal career command centre",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
