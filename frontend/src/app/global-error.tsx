"use client";

import { RouteError } from "@/components/RouteError";

import "./globals.css";
import "./orbitly.css";

/** Last-resort boundary when the root layout itself fails. */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <RouteError {...props} />
      </body>
    </html>
  );
}
