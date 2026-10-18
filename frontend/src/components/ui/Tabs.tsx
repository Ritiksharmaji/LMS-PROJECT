import type { CSSProperties, ReactNode } from "react";

export interface TabItem<V extends string> {
  label: ReactNode;
  value: V;
  count?: number;
}

export interface TabsProps<V extends string> {
  items: TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  variant?: "underline" | "pill";
  style?: CSSProperties;
}

export function Tabs<V extends string>({ items, value, onChange, variant = "underline", style }: TabsProps<V>) {
  return (
    <div className={"ob-tabs ob-tabs--" + variant} role="tablist" style={style}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button key={it.value} type="button" role="tab" aria-selected={active} className={"ob-tab" + (active ? " ob-tab--active" : "")} onClick={() => onChange(it.value)}>
            {it.label}
            {it.count != null && <span className="ob-tab__count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
