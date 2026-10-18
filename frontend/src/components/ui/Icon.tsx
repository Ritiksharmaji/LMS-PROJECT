import type { CSSProperties } from "react";

import { ICONS, isIconName, type IconName } from "./icons";

export interface IconProps {
  name: IconName | (string & {});
  size?: number;
  color?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** A Lucide icon by name. Unknown names (e.g. from data) fall back to a book. */
export function Icon({ name, size = 20, color, title, className, style }: IconProps) {
  const Glyph = ICONS[isIconName(name) ? name : "book-open"];
  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={2}
      className={"ob-icon" + (className ? " " + className : "")}
      style={style}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    />
  );
}
