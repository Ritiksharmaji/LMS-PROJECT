"use client";

import { useEffect, useRef } from "react";

const NUMBER = /^([^\d-]*)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/**
 * Renders `value` ("128", "4.7", "$1,240.00", "87%") and, once visible, counts its number up from zero,
 * keeping any prefix and suffix. The server output is the final value, so crawlers and no-JS visitors see it.
 * Values without a leading number ("—", "3 of 5") are shown as they are.
 */
export function CountUp({ value, duration = 1400, delay = 0 }: { value: string; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const m = NUMBER.exec(value);
    if (!el || !m || /\d/.test(m[3]) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, prefix, digits, suffix] = m;
    const target = Number(digits.replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return;
    const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
    const grouped = digits.includes(",");
    const fmt = (n: number) =>
      prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped }) + suffix;
    let raf = 0;
    el.textContent = fmt(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = value;
    };
  }, [value, duration, delay]);
  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      {value}
    </span>
  );
}
