"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { icon: "🏠", label: "Home", href: "/" },
  { icon: "🗺️", label: "Map", href: "/map" },
  { icon: "🆘", label: "SOS", href: "/" }, // SOS lives on Home for now — no dedicated route yet
  { icon: "🔔", label: "Alerts", href: "/alerts" },
  { icon: "📥", label: "Queue", href: "/offline" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom flex items-center justify-around border-t border-border-hairline bg-bg-surface-raised px-2 pt-2.5"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
              active ? "text-accent-cyan" : "text-text-muted"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
