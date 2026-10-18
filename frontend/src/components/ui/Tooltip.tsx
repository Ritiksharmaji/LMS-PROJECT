import type { ReactNode } from "react";

export function Tooltip({ content, placement = "top", open, children }: { content: ReactNode; placement?: "top" | "bottom"; open?: boolean; children: ReactNode }) {
  return (
    <span className="ob-tip">
      {children}
      <span role="tooltip" className={"ob-tip__bubble ob-tip__bubble--" + placement + (open ? " ob-tip__bubble--open" : "")}>
        {content}
      </span>
    </span>
  );
}
