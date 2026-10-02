// ============================================================================
// apps/admin/app/layout.tsx
// The frame around EVERY admin page: sidebar on the left, a fixed top bar
// (menu button + theme icon), and the page itself below.
//
// The top bar uses "sticky top-0", which keeps it pinned to the top of the
// screen while the page scrolls underneath it. It has its own background so
// content does not show through it.
//
// Menu button: on phone and iPad it is in this top bar and opens the sidebar
// as a drawer. On laptop it is hidden here, because the collapse button lives
// at the top of the sidebar itself (see app-sidebar.tsx).
//
// ThemeProvider (next-themes) makes Light / Dark / System work.
// suppressHydrationWarning on <html> stops a harmless warning, because
// next-themes sets the theme class before React loads.
// ============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* The sidebar component needs TooltipProvider somewhere above it. */}
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="min-w-0">
                {/* Fixed top bar: stays at the top while the page scrolls. */}
                <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
                  {/* Phone and iPad only: opens the sidebar drawer.
                      size-11 = 44px touch target. */}
                  <SidebarTrigger className="size-11 md:hidden" />
                  <span className="text-sm font-medium">UniNest admin</span>
                  <div className="ml-auto">
                    <ThemeToggle />
                  </div>
                </header>

                {/* min-w-0 stops wide content (like a table) from pushing the
                    page sideways on a phone. */}
                <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}