"use client";

// ============================================================================
// apps/admin/components/app-sidebar.tsx
// The admin's side navigation, built from shadcn's Sidebar.
//
// collapsible="icon" is what lets the sidebar shrink to a slim icon strip on
// laptop instead of disappearing. The collapse button sits at the top of the
// sidebar. On phone and iPad the sidebar is a drawer, opened from the menu
// button in the top bar (that button lives in layout.tsx).
//
// The footer exposes Clerk's account menu after the server verifies an
// allowlisted administrator session.
// ============================================================================

import { Building2, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

// The menu links. Each has an icon, because in the collapsed strip the icon
// is all that shows. Adding a page later is a one-line change here.
const NAV = [{ label: "Listings", href: "/", icon: Building2 }];

export function AppSidebar() {
  // Used to highlight the page the admin is currently on.
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* Brand on the left, collapse button on the right. When the sidebar is
          collapsed the brand text hides and only the collapse button stays,
          centred. The button is hidden below laptop width because there the
          sidebar is a drawer (the top bar's menu button opens it). */}
      <SidebarHeader className="flex-row items-center justify-between px-3 py-3 group-data-[collapsible=icon]:justify-center">
        <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
          UniNest admin
        </span>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpenMobile(false)}
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-sidebar-accent md:hidden"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        <SidebarTrigger className="hidden md:inline-flex" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {/* tooltip shows the name on hover when collapsed */}
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="min-h-11 md:min-h-8"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex min-h-11 items-center gap-3 px-2">
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
                <UserButton />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Sign-in setup required
                </span>
              )}
              <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                Account
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}