"use client";

// ============================================================================
// apps/admin/components/theme-toggle.tsx
// An icon button that lets the admin pick Light, Dark or System.
//
// The sun shows in light mode and the moon shows in dark mode. This is done
// with CSS ("dark:" classes), so there is no flicker on page load.
// next-themes remembers the choice and, for "System", follows the phone or
// laptop's own setting. The layout mounts this in the top bar.
// ============================================================================

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      {/* size-11 = 44px touch target on phone, a bit smaller on laptop. */}
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="size-11 md:size-9">
          {/* Only one of these two is visible at a time. */}
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
          {/* Screen readers need a name because there is no text. */}
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}