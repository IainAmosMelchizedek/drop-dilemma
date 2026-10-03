import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DROP DILEMMA — One stage. Shared energy.",
  description: "A live DJ party game for 2–8 friends. Build the crowd or drop for points. Join with a room code, no login needed.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
