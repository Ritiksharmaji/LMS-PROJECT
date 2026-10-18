import type { ButtonHTMLAttributes } from "react";

import type { ButtonSize, ButtonVariant } from "./Button";
import { cx } from "./cx";
import { Icon, type IconProps } from "./Icon";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconProps["name"];
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  round?: boolean;
}

export function IconButton({ icon, label, variant = "ghost", size = "md", round, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("ob-btn ob-iconbtn", "ob-btn--" + variant, "ob-btn--" + size, round && "ob-round", className)}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 16 : size === "lg" ? 22 : 18} />
    </button>
  );
}
