import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";
import { Icon, type IconProps } from "./Icon";

export type ButtonVariant = "primary" | "dark" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconProps["name"];
  iconRight?: IconProps["name"];
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** The Orbitly button. Pass `href` to render a link that looks like a button. */
export function Button(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", iconLeft, iconRight, fullWidth, loading, className, children, ...rest } = props;
  const is = size === "sm" ? 16 : 18;
  const classes = cx("ob-btn", "ob-btn--" + variant, "ob-btn--" + size, fullWidth && "ob-btn--full", className);
  const inner = (
    <>
      {loading ? <Icon name="loader-circle" size={is} className="ob-spin" /> : iconLeft && <Icon name={iconLeft} size={is} />}
      {children}
      {iconRight && <Icon name={iconRight} size={is} className="ob-btn__end" />}
    </>
  );
  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchor } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link href={href} className={classes} {...anchor}>
        {inner}
      </Link>
    );
  }
  const button = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={button.type ?? "button"} className={classes} {...button} disabled={button.disabled || loading}>
      {inner}
    </button>
  );
}
