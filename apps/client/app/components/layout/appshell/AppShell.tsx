import type { ReactNode } from "react";
import base from "./AppShell.module.css";
import tablet from "./AppShell.tablet.module.css";
import desktop from "./AppShell.desktop.module.css";
import BottomNav from "../bottomnav/BottomNav";
import SideRail from "../siderail/SideRail";

// Added clean space separators between every single fallback dynamic class variable:
const cls = {
  shell: `${base.shell} ${tablet.shell ?? ""} ${desktop.shell ?? ""}`,
  content: `${base.content} ${desktop.content ?? ""}`,
  navSlot: `${base.navSlot} ${desktop.navSlot ?? ""}`,
  railSlot: `${base.railSlot} ${desktop.railSlot ?? ""}`,
};

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={cls.shell}>
      <div className={cls.railSlot}>
        <SideRail />
      </div>
      <div className={cls.content}>{children}</div>
      <div className={cls.navSlot}>
        <BottomNav />
      </div>
    </div>
  );
}
