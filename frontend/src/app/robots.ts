import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/courses", "/certificates"], disallow: ["/learn", "/teach", "/admin", "/checkout", "/api", "/design-system"] },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
