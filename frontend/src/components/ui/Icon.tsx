import type { IconWeight } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

import { ICONS, isIconName, PLAIN_ICONS, type IconName } from "./icons";

export interface IconProps {
  name: IconName | (string & {});
  size?: number;
  color?: string;
  /** Defaults to duotone, or regular for interface glyphs. Use "fill" for solid stars and the like. */
  weight?: IconWeight;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** A Phosphor icon by name. Unknown names (e.g. from data) fall back to a book. */
export function Icon({ name, size = 20, color, weight, title, className, style }: IconProps) {
  const key: IconName = isIconName(name) ? name : "book-open";
  const Glyph = ICONS[key];
  return (
    <Glyph
      size={size}
      color={color ?? "currentColor"}
      weight={weight ?? (PLAIN_ICONS.has(key) ? "regular" : "duotone")}
      className={"ob-icon" + (className ? " " + className : "")}
      style={style}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    />
  );
}
