import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monopoly Gasy",
    short_name: "Monopoly Gasy",
    description: "Le Monopoly des rues d'Antananarivo, en ligne.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d3b2c",
    theme_color: "#0d3b2c",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
