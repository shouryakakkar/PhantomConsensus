import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phantom Consensus — Detect Hidden Misalignment",
  description:
    "Analyze meeting transcripts and Slack messages to reveal what your team actually believes was decided — not just what was written in the notes.",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased text-foreground bg-background transition-colors duration-300">
        <ThemeProvider>
          {/* Animated mesh background */}
          <div className="mesh-bg" aria-hidden="true">
            <div className="mesh-orb" />
          </div>
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
