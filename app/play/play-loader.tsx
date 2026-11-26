"use client";

import dynamic from "next/dynamic";

// The game is browser-only and heavy (three.js and the render stack), so it is loaded on demand and
// never server-rendered. Community pages therefore carry none of its weight. This holding screen uses
// inline styles because the game's own stylesheet arrives together with its code.
const GameShell = dynamic(() => import("@/features/game/shell/game-shell"), {
  ssr: false,
  loading: () => (
    <main
      role="status"
      style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#1b2138", color: "#f2efdf", fontFamily: "Georgia, serif", fontSize: "1.2rem" }}
    >
      Lighting the lamps…
    </main>
  ),
});

export default function PlayLoader() {
  return <GameShell />;
}
