"use client";

import { useEffect } from "react";

const SELECTOR = ".ob-reveal:not(.is-in), .ob-stagger:not(.is-in)";

/** Adds `.is-in` to `.ob-reveal` / `.ob-stagger` elements as they scroll into view, including ones rendered later. */
export function MotionObserver() {
  useEffect(() => {
    const reveal = (el: Element) => el.classList.add("is-in");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(SELECTOR).forEach(reveal);
      const mo = new MutationObserver(() => document.querySelectorAll(SELECTOR).forEach(reveal));
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          reveal(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
