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
// The footer account block is a placeholder: there is no login yet, so
// Settings and Sign out are disabled instead of pretending to work.
// ============================================================================

import { Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/sidebar";

// The menu links. Each has an icon, because in the collapsed strip the icon
// is all that shows. Adding a page later is a one-line change here.
const NAV = [{ label: "Listings", href: "/", icon: Building2 }];

// Placeholder until real login exists.
const ACCOUNT = { name: "Admin", note: "Not signed in yet", initials: "A" };

export function AppSidebar() {
  // Used to highlight the page the admin is currently on.
  const pathname = usePathname();

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

      {/* Pinned to the bottom of the sidebar, always visible. */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="min-h-11">
                  {/* Round badge with the initial, since no avatar image exists yet. */}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {ACCOUNT.initials}
                  </span>
                  <span className="flex min-w-0 flex-col text-left leading-tight">
                    <span className="truncate text-sm font-medium">{ACCOUNT.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{ACCOUNT.note}</span>
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              {/* Opens upward because the button sits at the bottom of the screen. */}
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>{ACCOUNT.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Settings (coming soon)</DropdownMenuItem>
                <DropdownMenuItem disabled>Sign out (needs login first)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}