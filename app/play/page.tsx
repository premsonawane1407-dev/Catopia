import type { Metadata, Viewport } from "next";
import PlayLoader from "./play-loader";

export const metadata: Metadata = {
  title: "Play Catopia · Market Street (prototype)",
  description: "A cozy, explorable street in the Catopia world. A prototype with a placeholder street and cat, not the real campus yet.",
};

// "cover" lets the game use the whole screen on phones with a notch; its buttons stay inside the safe area.
export const viewport: Viewport = {
  themeColor: "#1b2138",
  viewportFit: "cover",
};

export default function PlayPage() {
  return <PlayLoader />;
}
