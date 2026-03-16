import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "Anthropic-ai",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/api/", "/vault", "/dashboard", "/admin", "/report/"],
      },
    ],
    sitemap: "https://ghost-tax.com/sitemap.xml",
  };
}
