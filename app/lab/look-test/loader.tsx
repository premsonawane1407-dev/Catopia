"use client";

import dynamic from "next/dynamic";

// The 3D scene is browser-only, so it is loaded on the client without server rendering.
const LookTest = dynamic(() => import("./look-test"), {
  ssr: false,
  loading: () => <p style={{ color: "#fff", padding: 24 }}>Loading look test...</p>,
});

export default function LookTestLoader() {
  return <LookTest />;
}
