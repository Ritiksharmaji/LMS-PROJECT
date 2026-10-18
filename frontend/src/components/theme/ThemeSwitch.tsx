"use client";

import { useSyncExternalStore } from "react";

import { Icon, type IconName } from "@/components/ui";

export type Theme = "light" | "dark" | "system";

const KEY = "orb-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const OPTIONS: [Theme, IconName, string][] = [
  ["light", "sun", "Light"],
  ["dark", "moon", "Dark"],
  ["system", "monitor", "System"],
];

/** Light / Dark / System switch. The choice is kept in localStorage and applied before paint by THEME_SCRIPT. */
export function ThemeSwitch({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <div className={"ob-theme" + (className ? " " + className : "")} role="radiogroup" aria-label="Theme">
      {OPTIONS.map(([value, icon, label]) => (
        <button key={value} type="button" role="radio" aria-checked={theme === value} title={label} aria-label={label} className="ob-theme__opt" onClick={() => apply(value)}>
          <Icon name={icon} size={16} />
        </button>
      ))}
    </div>
  );
}

/** Runs in <head> before first paint so a stored choice never flashes the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
