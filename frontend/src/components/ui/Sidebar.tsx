"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { Icon, type IconProps } from "./Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconProps["name"];
  badge?: number | null;
  /** Exact match only (for section roots like /learn). */
  exact?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export function Sidebar({ sections, dark, footer, style, onNavigate }: { sections: NavSection[]; dark?: boolean; footer?: ReactNode; style?: CSSProperties; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (it: NavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
  return (
    <aside className={"ob-sidebar" + (dark ? " ob-sidebar--dark" : "")} style={style}>
      <Link href="/" className="ob-sidebar__brand no-underline hover:no-underline" style={{ color: dark ? "#fff" : "var(--ink-900)" }}>
        orbitly<span className="ob-logo-dot" style={{ color: "var(--coral-500)" }}>.</span>
      </Link>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 0, overflow: "auto" }}>
        {sections.map((s, i) => (
          <nav key={i} className="ob-sidebar__section" aria-label={s.label}>
            {s.label && <div className="ob-sidebar__label">{s.label}</div>}
            {s.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                aria-current={isActive(it) ? "page" : undefined}
                className={"ob-nav no-underline hover:no-underline" + (isActive(it) ? " ob-nav--active" : "")}
              >
                <Icon name={it.icon} size={19} />
                {it.label}
                {it.badge != null && it.badge > 0 && <span className="ob-nav__badge">{it.badge}</span>}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      {footer}
    </aside>
  );
}
