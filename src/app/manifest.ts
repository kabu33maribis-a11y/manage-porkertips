import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Real Poker Engine",
    short_name: "Poker",
    description: "物理テーブル用テキサスホールデム進行サポート",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#171717",
    orientation: "portrait",
  };
}
