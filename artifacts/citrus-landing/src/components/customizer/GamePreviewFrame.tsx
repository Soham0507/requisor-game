import { useEffect, useRef, useState } from "react";
import type { QuizQuestion, GameContent } from "@workspace/api-client-react";
import { changedFields, diffSnapshots, takeSnapshot, type Box, type Snapshot } from "./changeHighlights";
export interface BrandThemeMessage {
  gameContent?: GameContent | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  logoSize: number;
  brandName: string;
  brandNameSize: number;
  brandNameColor: string;
  heading: string;
  headingSize: number;
  headingColor: string;
  tagline: string;
  // Currently basketball-shootout only — the landing screen's background
  // image or video. null when the customer hasn't set one.
  bgUrl: string | null;
  // Basketball and soccer only: the top navigation bar color. null/undefined
  // keeps each game's own default bar.
  navbarColor?: string | null;
  // A custom uploaded font (woff2/woff/ttf/otf), applied to the brand name
  // and game title text. null falls back to each game's own default font.
  fontUrl: string | null;
  // Lexus Energy Quiz only — a fully custom question set, replacing the
  // game's built-in 5 questions. null/undefined falls back to those.
  quiz?: QuizQuestion[] | null;
}

export interface DeviceSize {
  width: number;
  height: number;
}

interface GamePreviewFrameProps {
  previewBasePath: string;
  theme: BrandThemeMessage;
  // null = fill the container responsively (the old/default "desktop" look).
  // Set = render the iframe at that literal device resolution, scaled down
  // to fit the available width, so the embedded game's own CSS/JS actually
  // sees (and responds to) that viewport size rather than just looking
  // smaller.
  deviceSize?: DeviceSize | null;
  // "Customizable areas" viewer: always outline changes (no on/off button),
  // word the label as "<area> — customizable area", and skip the outline for
  // updates flagged `quiet` (e.g. resetting the sample back to the default).
  exploreMode?: boolean;
  quiet?: boolean;
}

/** Embeds the real game and pushes live branding updates via the postMessage contract in game/BRANDING_CONTRACT.md. */
export function GamePreviewFrame({ previewBasePath, theme, deviceSize = null, exploreMode = false, quiet = false }: GamePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const themeRef = useRef(theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);

  // "Show what changed": after each edit, outline the exact parts of the game
  // that changed, with a label, so first-time users see where an edit lands.
  const prevThemeRef = useRef<BrandThemeMessage | null>(null);
  const pendingRef = useRef<{
    before: Snapshot;
    categories: Set<string>;
    labels: string[];
    timer: number;
    started: number;
    posted: number;
    lastMutation: number;
    observer: MutationObserver | null;
  } | null>(null);
  const clearTimerRef = useRef<number>(0);
  const [showChanges, setShowChanges] = useState(() => {
    try {
      return window.localStorage.getItem("cdh-show-changes") !== "0";
    } catch {
      return true;
    }
  });
  const showChangesRef = useRef(showChanges);
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const [highlight, setHighlight] = useState<{ id: number; label: string; boxes: Box[] } | null>(null);

  useEffect(() => {
    showChangesRef.current = showChanges || exploreMode;
    try {
      window.localStorage.setItem("cdh-show-changes", showChanges ? "1" : "0");
    } catch {
      /* optional */
    }
    if (!showChanges) setHighlight(null);
  }, [showChanges, exploreMode]);

  useEffect(
    () => () => {
      window.clearTimeout(clearTimerRef.current);
      if (pendingRef.current) {
        window.clearTimeout(pendingRef.current.timer);
        pendingRef.current.observer?.disconnect();
      }
    },
    [],
  );

  const trackChange = (prev: BrandThemeMessage, next: BrandThemeMessage) => {
    const doc = iframeRef.current?.contentDocument;
    const { labels, categories } = changedFields(prev, next);
    if (!doc?.body || !labels.length) return;
    // The first edit of a burst (typing, dragging a color) keeps its "before".
    const now = Date.now();
    const pending = pendingRef.current ?? {
      before: takeSnapshot(doc),
      categories: new Set<string>(),
      labels: [],
      timer: 0,
      started: now,
      posted: now,
      lastMutation: 0,
      observer: null,
    };
    pendingRef.current = pending;
    pending.posted = now;
    // Games apply an update at their own pace (some take half a second), so
    // wait until the page has stopped changing instead of using a fixed delay.
    if (!pending.observer) {
      pending.observer = new MutationObserver(() => {
        pending.lastMutation = Date.now();
      });
      pending.observer.observe(doc.body, { childList: true, characterData: true, subtree: true });
    }
    categories.forEach((c) => pending.categories.add(c));
    labels.forEach((l) => !pending.labels.includes(l) && pending.labels.push(l));
    window.clearTimeout(pending.timer);
    const check = () => {
      const t = Date.now();
      const settled = t - pending.posted >= 600 && t - pending.lastMutation >= 600;
      if (!settled && t - pending.started < 3000) {
        pending.timer = window.setTimeout(check, 100);
        return;
      }
      pending.observer?.disconnect();
      pendingRef.current = null;
      const frame = iframeRef.current;
      const gameDoc = frame?.contentDocument;
      const wrap = containerRef.current ?? wrapRef.current;
      if (!frame || !gameDoc?.body || !wrap) return;
      const found = diffSnapshots(pending.before, takeSnapshot(gameDoc), pending.categories as never, gameDoc);
      const f = frame.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      const k = f.width / (frame.clientWidth || f.width || 1);
      // Pad each outline a little and keep it inside the frame, so areas that
      // touch the edge (a navbar) are not clipped.
      const pad = 4;
      const boxes = found.map((b) => {
        const x0 = Math.max(2, f.left - w.left + b.x * k - pad);
        const y0 = Math.max(2, f.top - w.top + b.y * k - pad);
        const x1 = Math.min(w.width - 2, f.left - w.left + (b.x + b.w) * k + pad);
        const y1 = Math.min(w.height - 2, f.top - w.top + (b.y + b.h) * k + pad);
        return { ...b, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      });
      setHighlight({ id: Date.now(), label: pending.labels.slice(0, 2).join(" & "), boxes });
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setHighlight(null), 6000);
    };
    pending.timer = window.setTimeout(check, 100);
  };

  useEffect(() => {
    setReady(false);
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === "CDH_BRAND_READY" && event.source === iframeRef.current?.contentWindow) {
        // Device-mode changes remount the iframe. A second READY does not
        // change an already-true state, so send the current theme every time.
        iframeRef.current.contentWindow?.postMessage({ type: "CDH_BRAND_UPDATE", theme: themeRef.current }, window.location.origin);
        setReady(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewBasePath]);

  useEffect(() => {
    themeRef.current = theme;
    if (!ready) return;
    const prev = prevThemeRef.current;
    prevThemeRef.current = theme;
    if (prev && showChangesRef.current && !quietRef.current) trackChange(prev, theme);
    iframeRef.current?.contentWindow?.postMessage({ type: "CDH_BRAND_UPDATE", theme }, window.location.origin);
  }, [ready, theme]);

  // Recompute the scale-to-fit factor whenever the panel is resized (e.g. the
  // browser window changes) or the target device size changes.
  useEffect(() => {
    if (!deviceSize || !containerRef.current) {
      setScale(1);
      return;
    }
    const el = containerRef.current;
    const update = () => setScale(Math.min(1, el.clientWidth / deviceSize.width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [deviceSize]);

  const overlay = (
    <ChangeOverlay
      highlight={showChanges || exploreMode ? highlight : null}
      enabled={showChanges}
      exploreMode={exploreMode}
      onToggle={() => setShowChanges((v) => !v)}
    />
  );

  if (!deviceSize) {
    return (
      <div ref={wrapRef} className="relative rounded-xl overflow-hidden border border-border bg-black aspect-[4/3] w-full">
        <iframe
          ref={iframeRef}
          key={previewBasePath}
          src={previewBasePath}
          title="Live game preview"
          className="w-full h-full"
          data-testid="iframe-game-preview"
        />
        {overlay}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden border border-border bg-black w-full flex justify-center"
      style={{ height: deviceSize.height * scale }}
    >
      <div
        style={{
          width: deviceSize.width,
          height: deviceSize.height,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <iframe
          ref={iframeRef}
          key={previewBasePath}
          src={previewBasePath}
          title="Live game preview"
          width={deviceSize.width}
          height={deviceSize.height}
          style={{ display: "block", border: 0 }}
          data-testid="iframe-game-preview"
        />
      </div>
      {overlay}
    </div>
  );
}

interface ChangeOverlayProps {
  highlight: { id: number; label: string; boxes: Box[] } | null;
  enabled: boolean;
  exploreMode: boolean;
  onToggle: () => void;
}

// Motion for the change overlay. Plain CSS (with an @property angle for the
// spinning gradient ring), switched off for people who prefer reduced motion.
const OVERLAY_CSS = `
@property --cdh-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes cdh-life { 0%, 88% { opacity: 1 } 100% { opacity: 0 } }
@keyframes cdh-dim { from { opacity: 0 } to { opacity: 1 } }
@keyframes cdh-pop { 0% { opacity: 0; transform: scale(1.18); filter: blur(6px) } 60% { opacity: 1; transform: scale(0.985); filter: blur(0) } 100% { opacity: 1; transform: scale(1); filter: blur(0) } }
@keyframes cdh-spin { to { --cdh-angle: 360deg } }
@keyframes cdh-ripple { 0% { opacity: .55; transform: scale(1) } 100% { opacity: 0; transform: scale(1.22) } }
@keyframes cdh-breathe { 0%, 100% { box-shadow: 0 0 22px 2px rgba(249,115,22,.45), 0 0 60px 8px rgba(236,72,153,.25) } 50% { box-shadow: 0 0 34px 6px rgba(249,115,22,.7), 0 0 90px 16px rgba(236,72,153,.4) } }
@keyframes cdh-label { 0% { opacity: 0; transform: translate(-50%, 10px) scale(.92) } 100% { opacity: 1; transform: translate(-50%, 0) scale(1) } }
@keyframes cdh-dot { 0%, 100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.7); opacity: .45 } }
@keyframes cdh-shimmer { from { background-position: 0% 0 } to { background-position: 200% 0 } }
.cdh-box { animation: cdh-pop .55s cubic-bezier(.2,.9,.3,1.1) both, cdh-breathe 2.2s ease-in-out .55s infinite; }
.cdh-ring { padding: 3px; background: conic-gradient(from var(--cdh-angle), #f97316, #ec4899, #8b5cf6, #38bdf8, #f97316); animation: cdh-spin 3.2s linear infinite;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
.cdh-ripple { animation: cdh-ripple 1.7s ease-out .5s 2 both; }
.cdh-label { transform: translate(-50%, 0); animation: cdh-label .5s cubic-bezier(.2,.9,.3,1.2) .15s both; }
.cdh-dot { animation: cdh-dot 1.4s ease-in-out infinite; }
.cdh-frame { background: linear-gradient(90deg, #f97316, #ec4899, #8b5cf6, #f97316); background-size: 200% 100%; animation: cdh-shimmer 3s linear infinite;
  padding: 3px; -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
@media (prefers-reduced-motion: reduce) {
  .cdh-box, .cdh-ring, .cdh-ripple, .cdh-label, .cdh-dot, .cdh-frame { animation: none !important; }
}
`;

/** Spotlights and labels what the last edit changed; sits on top of the preview without blocking clicks. */
function ChangeOverlay({ highlight, enabled, exploreMode, onToggle }: ChangeOverlayProps) {
  const found = highlight && highlight.boxes.length > 0;
  const spots = highlight?.boxes.filter((b) => !b.full) ?? [];
  const frames = highlight?.boxes.filter((b) => b.full) ?? [];
  // Put the label just below the first spotlit area (above it when that area
  // is near the bottom), so it never covers what it is pointing at.
  const anchor = spots[0];
  const labelStyle = anchor
    ? {
        left: `clamp(120px, ${anchor.x + anchor.w / 2}px, calc(100% - 120px))`,
        top: anchor.y > 120 ? anchor.y - 46 : anchor.y + anchor.h + 16,
      }
    : { left: "50%", top: 10 };
  const text = found
    ? exploreMode
      ? `${highlight.label} — customizable area`
      : `${highlight.label} changed — highlighted here`
    : exploreMode
      ? `${highlight?.label} — customizable area. It shows on another screen; play through to see it.`
      : `${highlight?.label} updated — it shows on another screen. Play through to see it.`;
  return (
    <>
      {highlight && (
        <div
          key={highlight.id}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ animation: "cdh-life 6s linear both" }}
          data-testid="change-overlay"
        >
          <style>{OVERLAY_CSS}</style>
          {spots.length > 0 && (
            // Dim everything except the changed areas, so the eye lands on them.
            <svg className="absolute inset-0 h-full w-full" style={{ animation: "cdh-dim .45s ease-out both" }} aria-hidden="true">
              <defs>
                <mask id={`cdh-mask-${highlight.id}`}>
                  <rect width="100%" height="100%" fill="#fff" />
                  {spots.map((b, i) => (
                    <rect key={i} x={b.x - 2} y={b.y - 2} width={b.w + 4} height={b.h + 4} rx={10} fill="#000" />
                  ))}
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(8,10,20,0.58)" mask={`url(#cdh-mask-${highlight.id})`} />
            </svg>
          )}
          {frames.map((b, i) => (
            <div key={`f${i}`} className="cdh-frame absolute inset-1 rounded-xl" />
          ))}
          {spots.map((b, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: b.x, top: b.y, width: b.w, height: b.h, animationDelay: `${i * 90}ms` }}
            >
              <div className="cdh-box absolute inset-0 rounded-[10px]" style={{ animationDelay: `${i * 90}ms, ${550 + i * 90}ms` }} />
              <div className="cdh-ripple absolute inset-0 rounded-[10px] border-2 border-orange-400" />
              <div className="cdh-ring absolute inset-0 rounded-[10px]" />
            </div>
          ))}
          <div
            className="cdh-label absolute flex max-w-[92%] items-center gap-2 rounded-full border border-white/25 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md"
            style={labelStyle}
          >
            <span className="cdh-dot h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
            <span>{text}</span>
          </div>
        </div>
      )}
      {!exploreMode && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute bottom-2 right-2 z-20 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
          aria-pressed={enabled}
          data-testid="button-toggle-change-highlights"
        >
          {enabled ? "Highlighting changes: on" : "Highlighting changes: off"}
        </button>
      )}
    </>
  );
}
