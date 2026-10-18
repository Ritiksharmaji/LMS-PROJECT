"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon, type IconProps } from "./Icon";
import { IconButton } from "./IconButton";

const TONES = {
  accent: ["var(--coral-100)", "var(--coral-700)"],
  danger: ["var(--danger-soft)", "var(--danger-text)"],
  success: ["var(--success-soft)", "var(--success-text)"],
  orbit: ["var(--orbit-100)", "var(--orbit-700)"],
} as const;

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconProps["name"];
  iconTone?: keyof typeof TONES;
  footer?: ReactNode;
  width?: number;
  children?: ReactNode;
}

/** Modal dialog on a blurred scrim. Escape and clicking outside close it; focus moves into it when it opens. */
export function Dialog({ open, onClose, title, description, icon, iconTone = "accent", footer, width = 460, children }: DialogProps) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = box.current?.querySelector<HTMLElement>("input, textarea, select, button:not([aria-label='Close'])");
    (focusable ?? box.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const [bg, fg] = TONES[iconTone];
  return createPortal(
    <div className="ob-scrim" onClick={onClose}>
      <div
        ref={box}
        tabIndex={-1}
        className="ob-dialog"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ob-dialog__head">
          {icon && (
            <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: bg, color: fg }}>
              <Icon name={icon} />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id={titleId} className="ob-dialog__title">
              {title}
            </div>
            {description && <div style={{ font: "400 14px/22px var(--font-body)", color: "var(--text-muted)", marginTop: 4 }}>{description}</div>}
          </div>
          {onClose && <IconButton icon="x" label="Close" size="sm" onClick={onClose} />}
        </div>
        {children && <div className="ob-dialog__body">{children}</div>}
        {footer && <div className="ob-dialog__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
