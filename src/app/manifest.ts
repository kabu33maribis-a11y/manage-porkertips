import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Real Poker Engine",
    short_name: "Poker",
    description: "物理テーブル用テキサスホールデム進行サポート",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fc",
    theme_color: "#f3f6fc",
    orientation: "portrait",
  };
}
