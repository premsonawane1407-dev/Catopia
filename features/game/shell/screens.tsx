// The screens around the game: loading, "press to begin", the friendly fallbacks, the rotate-your-phone
// hint and the little pause button. (The pause menu itself is in pause-menu.tsx.) They only show things
// and report clicks; the rules live in the shell.
import { ArrowLeft, PawPrint, Play, RotateCw, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";

export const COMMUNITY_HREF = "/community-preview";

/**
 * A dialog card. When it appears, keyboard focus moves to the control marked `data-autofocus` (or the
 * first button or link), so Enter or Space works straight away and screen readers announce the dialog.
 */
function Card({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    card.current?.querySelector<HTMLElement>("[data-autofocus], button, a[href]")?.focus();
  }, []);
  return (
    <div ref={card} className="cg-card" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}

export function LoadingScreen({ progress }: { progress: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="cg-screen cg-screen--loading" role="status" aria-live="polite">
      <div className="cg-loading">
        <PawPrint className="cg-loading-paw" size={34} aria-hidden="true" />
        <p className="cg-loading-title">Lighting the lamps…</p>
        <div className="cg-progress" role="progressbar" aria-label="Loading the street" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <i style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

export function BeginScreen({ onBegin }: { onBegin: () => void }) {
  const titleId = useId();
  return (
    <div className="cg-screen cg-screen--begin">
      <Card labelledBy={titleId}>
        <p className="cg-eyebrow">Prototype street</p>
        <h1 id={titleId} className="cg-title">
          Evening on Market Street
        </h1>
        <p className="cg-body">A quiet corner to look around. Sound starts when you begin, and you can mute it whenever you like.</p>
        <button type="button" data-autofocus className="cg-btn cg-btn--primary" onClick={onBegin}>
          <Play size={18} aria-hidden="true" /> Begin
        </button>
        <p className="cg-controls-hint">Move with the arrow keys or WASD (Shift to run, Space to jump, E to interact, 1 to 6 or Q for emotes), a gamepad, or by dragging or tapping the screen.</p>
        <p className="cg-fine">A placeholder street and cat, not the real campus yet.</p>
      </Card>
    </div>
  );
}

export type ProblemKind = "unsupported" | "error" | "lost";

const PROBLEMS: Record<ProblemKind, { title: string; body: string; retry?: string }> = {
  unsupported: {
    title: "This browser can't show the street",
    body: "The game world needs WebGL 2, which this browser or device doesn't offer. Try a recent Chrome, Edge, Firefox or Safari, and check that hardware acceleration is on. The rest of Catopia works as usual.",
  },
  error: {
    title: "The street didn't load",
    body: "Something went wrong while setting it up.",
    retry: "Try again",
  },
  lost: {
    title: "The picture was interrupted",
    body: "The browser paused the graphics, which can happen when a device is busy or short on memory. Nothing was lost.",
    retry: "Reload the street",
  },
};

export function ProblemScreen({ kind, detail, onRetry }: { kind: ProblemKind; detail?: string; onRetry?: () => void }) {
  const titleId = useId();
  const problem = PROBLEMS[kind];
  return (
    <div className="cg-screen cg-screen--problem">
      <Card labelledBy={titleId}>
        <h1 id={titleId} className="cg-title">
          {problem.title}
        </h1>
        <p className="cg-body">{problem.body}</p>
        {detail && <p className="cg-fine cg-detail">{detail}</p>}
        {problem.retry && onRetry && (
          <button type="button" data-autofocus className="cg-btn cg-btn--primary" onClick={onRetry}>
            <RotateCw size={18} aria-hidden="true" /> {problem.retry}
          </button>
        )}
        <Link href={COMMUNITY_HREF} prefetch={false} className="cg-btn cg-btn--ghost">
          <ArrowLeft size={18} aria-hidden="true" /> Back to Catopia
        </Link>
      </Card>
    </div>
  );
}

export function RotateScreen({ onDismiss }: { onDismiss: () => void }) {
  const titleId = useId();
  return (
    <div className="cg-screen cg-screen--rotate">
      <Card labelledBy={titleId}>
        <Smartphone className="cg-rotate-icon" size={40} aria-hidden="true" />
        <h2 id={titleId} className="cg-title">
          Turn your phone sideways
        </h2>
        <p className="cg-body">The street is wider than it is tall, so it looks best in landscape.</p>
        <button type="button" data-autofocus className="cg-btn cg-btn--ghost" onClick={onDismiss}>
          Play anyway
        </button>
      </Card>
    </div>
  );
}

/** The only control on screen while playing: a small II in the far corner. */
export function PauseButton({ onPause }: { onPause: () => void }) {
  return (
    <button type="button" className="cg-pause-btn" aria-label="Pause" onClick={onPause}>
      <span className="cg-pause-glyph" aria-hidden="true">
        <i />
        <i />
      </span>
    </button>
  );
}
