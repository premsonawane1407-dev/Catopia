// The size of the window the game fills, in CSS pixels, plus the display's pixel density.
import { useEffect, useState } from "react";

export interface ViewportSize {
  width: number;
  height: number;
  dpr: number;
}

function readViewport(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 };
}

/** Client-only: the game is never rendered on the server, so reading `window` for the first value is safe. */
export function useViewport(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(readViewport);
  useEffect(() => {
    const update = () =>
      setSize((previous) => {
        const next = readViewport();
        return previous.width === next.width && previous.height === next.height && previous.dpr === next.dpr ? previous : next;
      });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return size;
}
