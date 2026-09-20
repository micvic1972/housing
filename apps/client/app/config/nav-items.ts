export type NavId = "home" | "map" | "inspections" | "profile" | "more";

export interface NavItem {
  id: NavId;
  label: string;
  href: string;
}

// Single source of truth for BottomNav and SideRail.
// Change the tab set here only — both navs update together.
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "map", label: "Map", href: "/map" },
  { id: "inspections", label: "Inspections", href: "/inspections" },
  { id: "profile", label: "Profile", href: "/profile" },
  { id: "more", label: "More", href: "/more" },
];