"use client";

import { createContext, useCallback, useContext, useState, type CSSProperties, type ReactNode } from "react";

import { Icon, type IconProps } from "./Icon";
import { IconButton } from "./IconButton";

export type ToastTone = "success" | "info" | "warning" | "danger" | "accent";

const T: Record<ToastTone, [IconProps["name"], string]> = {
  success: ["check", "var(--success)"],
  info: ["info", "var(--info)"],
  warning: ["triangle-alert", "var(--warning)"],
  danger: ["circle-x", "var(--danger)"],
  accent: ["sparkles", "var(--accent)"],
};

export interface ToastProps {
  tone?: ToastTone;
  title: ReactNode;
  message?: ReactNode;
  light?: boolean;
  onClose?: () => void;
  action?: ReactNode;
  style?: CSSProperties;
}

export function Toast({ tone = "success", title, message, light, onClose, action, style }: ToastProps) {
  const [ic, col] = T[tone];
  return (
    <div className={"ob-toast" + (light ? " ob-toast--light" : "")} style={style} role="status">
      <span className="ob-toast__icon" style={{ background: col, color: "#fff" }}>
        <Icon name={ic} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ob-toast__title">{title}</div>
        {message && <div className="ob-toast__msg">{message}</div>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
      {onClose && <IconButton icon="x" label="Dismiss" size="sm" onClick={onClose} style={{ color: light ? undefined : "var(--ink-300)" }} />}
    </div>
  );
}

type ToastInput = Omit<ToastProps, "onClose" | "style">;
const ToastContext = createContext<(t: ToastInput) => void>(() => {});

/** Shows toasts in the bottom-right corner. Use `useToast()` anywhere below it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<(ToastInput & { id: number })[]>([]);
  const show = useCallback((t: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => setToasts((list) => list.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
