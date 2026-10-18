import type { CSSProperties, HTMLAttributes } from "react";

const BGS = ["var(--coral-100)", "var(--orbit-100)", "var(--green-100)", "var(--amber-100)", "var(--sky-100)"];
const STATUS = { online: "var(--success)", away: "var(--warning)", offline: "var(--ink-300)" };

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string | null;
  src?: string | null;
  size?: number;
  status?: keyof typeof STATUS;
}

/** Photo, or initials on a colour picked from the name (stable per person). */
export function Avatar({ name = "", src, size = 36, status, style, ...rest }: AvatarProps) {
  const label = name ?? "";
  const initials = label
    .split(" ")
    .filter((s) => s && !/^(dr|prof)\.?$/i.test(s))
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = BGS[[...label].reduce((a, c) => a + c.charCodeAt(0), 0) % BGS.length];
  return (
    <span
      className="ob-avatar"
      style={{ width: size, height: size, background: src ? "transparent" : bg, fontSize: size * 0.38, ...style } as CSSProperties}
      {...rest}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary storage hosts */}
      {src ? <img src={src} alt={label} /> : initials}
      {status && <i className="ob-avatar__status" style={{ background: STATUS[status] }} />}
    </span>
  );
}
