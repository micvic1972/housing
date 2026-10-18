// ============================================================================
// apps/admin/app/layout.tsx
// Sidebar + sticky top bar (menu, auth, theme) + page content.
// Clerk v7: use <Show when="signed-in|signed-out"> — not SignedIn/SignedOut.
// ============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import {
  ClerkProvider,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniNest admin",
  description: "Internal tool for entering and verifying listings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="min-w-0">
                  <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
                    <SidebarTrigger className="size-11 md:hidden" />
                    <span className="text-sm font-medium">UniNest admin</span>
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
                  <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
                </SidebarInset>
              </SidebarProvider>
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}