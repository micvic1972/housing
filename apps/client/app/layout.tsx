import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "./globals.css";
import AppShell from "./components/layout/AppShell";

export const metadata: Metadata = {
  title: { default: "UniNest", template: "%s | UniNest" },
  description: "Find verified student accommodation near UNIDEL.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1120",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}