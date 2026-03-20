import type { MetadataRoute } from "next";

const iconVersion = "2";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuickPercent",
    short_name: "QP",
    description: "全体と成果を入力して割合を即座に算出",
    start_url: "/",
    display: "standalone",
    background_color: "#fffbf5",
    theme_color: "#fffbf5",
    icons: [
      {
        src: `/icon-192.png?v=${iconVersion}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icon-512.png?v=${iconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icon-512.png?v=${iconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
