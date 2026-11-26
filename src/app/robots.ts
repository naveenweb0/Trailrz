import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl() || "https://trailrz.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/gate", "/checkout", "/booking/success", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
