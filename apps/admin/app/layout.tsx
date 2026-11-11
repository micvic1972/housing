// ============================================================================
// apps/admin/app/layout.tsx
// Sidebar + sticky top bar (menu, auth, theme) + page content.
// Clerk v7: use <Show when="signed-in|signed-out"> — not SignedIn/SignedOut.
// ============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import "./globals.css";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  clerkAdminIsConfigured,
  isLocalDemoModeEnabled,
} from "@/lib/admin-authorization";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Delta Housing admin",
  description: "Internal tool for entering and verifying listings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkConfigured = clerkAdminIsConfigured();
  const demoMode = isLocalDemoModeEnabled();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {clerkConfigured ? (
          <ClerkProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <TooltipProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset className="min-w-0">
                    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
                      <SidebarTrigger className="size-11 md:hidden" />
                      <span className="text-sm font-medium">
                        Delta Housing admin
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Show when="signed-out">
                          <SignInButton mode="modal">
                            <button
                              type="button"
                              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                            >
                              Sign in
                            </button>
                          </SignInButton>
                        </Show>
                        <Show when="signed-in">
                          <UserButton />
                        </Show>
                        <ThemeToggle />
                      </div>
                    </header>
                    <main className="min-w-0 flex-1 p-4 sm:p-6">
                      {children}
                    </main>
                  </SidebarInset>
                </SidebarProvider>
              </TooltipProvider>
            </ThemeProvider>
          </ClerkProvider>
        ) : demoMode ? (
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="min-w-0">
                  <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
                    <SidebarTrigger className="size-11 md:hidden" />
                    <span className="text-sm font-medium">
                      Delta Housing admin
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="rounded-md border bg-muted px-2.5 py-1 text-xs font-medium">
                        Demo admin
                      </span>
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
                </SidebarInset>
              </SidebarProvider>
            </TooltipProvider>
          </ThemeProvider>
        ) : (
          <main className="mx-auto flex min-h-screen max-w-xl items-center p-6">
            <section className="space-y-3 rounded-xl border bg-card p-6">
              <h1 className="text-xl font-semibold">Admin sign-in unavailable</h1>
              <p className="text-sm text-muted-foreground" role="alert">
                Configure a matching Clerk key pair and trusted administrator IDs
                for this environment. Production must use Clerk Production keys.
              </p>
            </section>
          </main>
        )}
      </body>
    </html>
  );
}
