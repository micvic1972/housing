import { Droplet, Zap, Wifi, Lock, type LucideIcon } from "lucide-react";
import type { FacilityId } from "../types/listing";

// Display metadata for each facility tag shown on a card.
export const FACILITIES: Record<FacilityId, { label: string; icon: LucideIcon }> = {
  water: { label: "Water", icon: Droplet },
  power: { label: "Power", icon: Zap },
  wifi: { label: "Wi-Fi", icon: Wifi },
  security: { label: "Security", icon: Lock },
};