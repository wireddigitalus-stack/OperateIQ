import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/staff/", "/meet/", "/l/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/staff/", "/meet/", "/l/"],
      },
    ],
    sitemap: "https://www.teamvisionllc.com/sitemap.xml",
    host: "https://www.teamvisionllc.com",
  };
}
