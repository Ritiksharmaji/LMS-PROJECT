"use client";

import { useEffect, useRef } from "react";

/**
 * Renders `value` (e.g. "128", "4.7") and, once visible, counts up to it from zero.
 * The server output is the final number, so crawlers and no-JS visitors see the real value.
 */
export function CountUp({ value, duration = 1400, delay = 0 }: { value: string; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const target = Number(value);
    if (!el || !Number.isFinite(target) || target <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const decimals = value.includes(".") ? value.split(".")[1].length : 0;
    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    let raf = 0;
    el.textContent = fmt(0);
    const run = () => {
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      run();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = fmt(target);
    };
  }, [value, duration, delay]);
  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      {value}
    </span>
  );
}
