import type { HTMLAttributes } from "react";

import { cx } from "./cx";
import { Icon, type IconProps } from "./Icon";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  selected?: boolean;
  icon?: IconProps["name"];
  onRemove?: () => void;
}

export function Tag({ selected, onClick, onRemove, icon, children, className, ...rest }: TagProps) {
  return (
    <span
      className={cx("ob-tag", onClick && "ob-tag--selectable", selected && "ob-tag--selected", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? !!selected : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e as never) : undefined}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
      {onRemove && (
        <button
          type="button"
          className="ob-tag__x"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </span>
  );
}
