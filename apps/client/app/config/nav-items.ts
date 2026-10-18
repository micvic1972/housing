export type NavId = "home" | "map" | "inspection" | "messages" | "profile";

export interface NavItem {
  id: NavId;
  label: string;
  href: string;
  requiresAuth?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "map", label: "Map", href: "/map" },
  {
    id: "inspection",
    label: "Inspection",
    href: "/inspection",
    requiresAuth: true,
  },
  { id: "messages", label: "Messages", href: "/messages", requiresAuth: true },
  { id: "profile", label: "Profile", href: "/profile", requiresAuth: true },
];