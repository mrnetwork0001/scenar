import type { MetadataRoute } from "next";

/** Installable app (PWA): Add to Home Screen on iOS/Android opens Scenar full-screen, straight into the app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scenar - Rehearse the conversations that matter",
    short_name: "Scenar",
    description:
      "Practise salary negotiations, saying no and hard feedback against AI counterparts with hidden agendas.",
    id: "/app",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["education", "productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
