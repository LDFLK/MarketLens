"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  // { name: "Vacancies", href: "/vacancies", icon: BriefcaseIcon },
  // { name: "Skill Analysis", href: "/skills", icon: BarChart3Icon },
  { name: "KPIs", href: "/kpis", icon: GaugeIcon },
  // { name: "Crawling Details", href: "/crawling-details", icon: ScanSearchIcon },
  // { name: "Regional View", href: "/regions", icon: MapPinIcon },
  { name: "Forecasting", href: "/forecasting", icon: TrendingUpIcon },
  // { name: "Agent Management", href: "/agents", icon: BotIcon },
  // { name: "Settings", href: "/settings", icon: SettingsIcon },
];

const COLLAPSED_W = "4rem"; // w-16

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const content =
      (document.getElementById("main-content") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null) ??
      (asideRef.current?.nextElementSibling as HTMLElement | null);
    if (!content) return;

    const computed = window.getComputedStyle(content);
    const prop: "marginLeft" | "paddingLeft" =
      parseFloat(computed.marginLeft) >= 100 ? "marginLeft" : "paddingLeft";

    content.style.transition = "margin-left 200ms ease, padding-left 200ms ease";
    content.style[prop] = collapsed ? COLLAPSED_W : "";

    return () => {
      content.style[prop] = "";
    };
  }, [collapsed]);

  return (
    <aside
      ref={asideRef}
      className={clsx(
        "fixed inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-800 flex flex-col font-sans transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Collapse toggle — sits on the sidebar's right border */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-16 z-50 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors shadow-md cursor-pointer"
      >
        <ChevronLeftIcon
          className={clsx("w-3.5 h-3.5 transition-transform duration-200", collapsed && "rotate-180")}
        />
      </button>

      {/* Logo Component */}
      <div
        className={clsx(
          "flex items-center gap-3 py-5 border-b border-zinc-800",
          collapsed ? "px-3.5 justify-center" : "px-6"
        )}
      >
        <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center border border-zinc-700 shrink-0">
          <span className="text-black font-black text-sm">ML</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-white font-bold text-sm tracking-tight leading-tight">Market Lens</h1>
            <p className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider leading-tight mt-0.5">
              Labour Intelligence
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// --- Inline Minimal SVG Icon components ---

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function LayoutDashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ScanSearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  );
}