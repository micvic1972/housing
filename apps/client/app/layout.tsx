import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/tokens.css";
import "./globals.css";
import AppShell from "./components/layout/appshell/AppShell";
import { FiltersProvider } from "./components/filter/FilterProvider";
import { ListingsProvider } from "./lib/listings-provider";
import { SavedListingsProvider } from "./lib/saved-listings";
import { StudentActivityProvider } from "./lib/student-activity";
import { AppearanceProvider } from "./lib/appearance-provider";
import { isClientClerkConfigured } from "./lib/clerk-config";

const appearanceBootstrap = `(() => {
  try {
    const stored = localStorage.getItem("delta-housing.appearance.v1");
    if (!stored) return;

    const preferences = JSON.parse(stored);
    const mode = preferences?.mode;
    const accent = preferences?.accent;
    const validMode = mode === "system" || mode === "light" || mode === "dark";
    const validAccent =
      accent === "blue" ||
      accent === "terracotta" ||
      accent === "forest" ||
      accent === "lavender-sage";

    if (validMode && validAccent) {
      document.documentElement.dataset.theme = mode;
      document.documentElement.dataset.accent =
        accent === "forest" ? "blue" : accent === "lavender-sage" ? "terracotta" : accent;
    }
  } catch {
    // The provider reports storage errors after hydration.
  }
})();`;

export const metadata: Metadata = {
  title: { default: "Delta Housing", template: "%s | Delta Housing" },
  description: "Find student accommodation around UNIDEL.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f6f1",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const app = (
    <FiltersProvider>
      <ListingsProvider>
        <SavedListingsProvider>
          <StudentActivityProvider>
            <AppShell>{children}</AppShell>
          </StudentActivityProvider>
        </SavedListingsProvider>
      </ListingsProvider>
    </FiltersProvider>
  );

  return (
    <html
      lang="en"
      data-theme="light"
      data-accent="blue"
      suppressHydrationWarning
    >
      <body>
        <Script
          id="appearance-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: appearanceBootstrap }}
        />
        <AppearanceProvider>
          {isClientClerkConfigured() ? (
            <ClerkProvider
              signInUrl="/sign-in"
              signUpUrl="/sign-up"
              appearance={{
                variables: {
                  colorPrimary: "var(--primary)",
                },
              }}
            >
              {app}
            </ClerkProvider>
          ) : (
            app
          )}
        </AppearanceProvider>
      </body>
    </html>
  );
}
