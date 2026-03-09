import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfterBite",
    short_name: "AfterBite",
    description: "Track meals and symptoms to discover food impact patterns.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2faf9",
    theme_color: "#2f8a7c"
  };
}
