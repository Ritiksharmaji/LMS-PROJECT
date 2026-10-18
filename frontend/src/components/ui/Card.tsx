import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: "default" | "flat" | "sunken";
  interactive?: boolean;
  title?: ReactNode;
  action?: ReactNode;
  padding?: number | string;
}

export function Card({ variant = "default", interactive, title, action, padding = 20, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx("ob-card", variant !== "default" && "ob-card--" + variant, interactive && "ob-card--interactive", className)}
      {...rest}
    >
      {(title || action) && (
        <div className="ob-card__head">
          <div className="ob-card__title">{title}</div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}
