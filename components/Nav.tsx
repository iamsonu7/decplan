"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Simple line icons (24x24, stroke only).
const ICONS: Record<string, string> = {
  today: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
  plan: "M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  outreach: "M4 6h16v12H4zM4 7l8 6 8-6",
  contacts: "M16 19v-1a4 4 0 00-8 0v1M12 11a3 3 0 100-6 3 3 0 000 6zM4 4h16v16H4z",
  notes: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
  opportunities: "M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z",
  deliverables: "M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8",
  learning: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M8 7h7",
  settings: "M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4",
};

export const NAV = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/outreach", label: "Outreach", icon: "outreach" },
  { href: "/contacts", label: "Contacts", icon: "contacts" },
  { href: "/notes", label: "Notes", icon: "notes" },
  { href: "/opportunities", label: "Opportunities", icon: "opportunities" },
  { href: "/deliverables", label: "Deliverables", icon: "deliverables" },
  { href: "/learning", label: "Learning log", icon: "learning" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Pages">
      {NAV.map((item) => {
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-[1.5px] px-3 py-1.5 font-semibold ${active ? "border-ink bg-paper" : "border-transparent hover:bg-paper/60"}`}
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONS[item.icon]} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
