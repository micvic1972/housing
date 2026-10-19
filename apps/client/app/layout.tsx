import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/tokens.css";
import "./globals.css";
import AppShell from "./components/layout/appshell/AppShell";
import { FiltersProvider } from "./components/filter/FilterProvider";
import { ListingsProvider } from "./lib/listings-provider";
import { SavedListingsProvider } from "./lib/saved-listings";
import { isClientClerkConfigured } from "./lib/clerk-config";

export const metadata: Metadata = {
  title: { default: "Delta Housing", template: "%s | Delta Housing" },
  description: "Find student accommodation around UNIDEL.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1120",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const app = (
    <FiltersProvider>
      <ListingsProvider>
        <SavedListingsProvider>
          <AppShell>{children}</AppShell>
        </SavedListingsProvider>
      </ListingsProvider>
    </FiltersProvider>
  );

  return (
    <html lang="en">
      <body>
        {isClientClerkConfigured() ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                colorPrimary: "#3b82f6",
              },
              elements: {
                card: "border border-[#334155] bg-[#1e293b] text-[#f8fafc] shadow-2xl",
                headerTitle: "text-[#f8fafc]",
                headerSubtitle: "text-[#94a3b8]",
                formFieldLabel: "text-[#cbd5e1]",
                formFieldInput:
                  "border-[#334155] bg-[#0b1120] text-[#f8fafc]",
                formButtonPrimary: "bg-[#3b82f6] hover:bg-[#2563eb]",
                footerActionLink: "text-[#60a5fa] hover:text-[#93c5fd]",
              },
            }}
          >
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
      </body>
    </html>
  );
}