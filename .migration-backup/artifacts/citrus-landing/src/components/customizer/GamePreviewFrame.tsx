import { useEffect, useRef, useState } from "react";

export interface BrandThemeMessage {
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
  // A custom uploaded font (woff2/woff/ttf/otf), applied to the brand name
  // and game title text. null falls back to each game's own default font.
  fontUrl: string | null;
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
}

/** Embeds the real game and pushes live branding updates via the postMessage contract in game/BRANDING_CONTRACT.md. */
export function GamePreviewFrame({ previewBasePath, theme, deviceSize = null }: GamePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setReady(false);
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "CDH_BRAND_READY" && event.source === iframeRef.current?.contentWindow) {
        setReady(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewBasePath]);

  useEffect(() => {
    if (!ready) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "CDH_BRAND_UPDATE", theme }, "*");
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

  if (!deviceSize) {
    return (
      <div className="rounded-xl overflow-hidden border border-border bg-black aspect-[4/3] w-full">
        <iframe
          ref={iframeRef}
          key={previewBasePath}
          src={previewBasePath}
          title="Live game preview"
          className="w-full h-full"
          data-testid="iframe-game-preview"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-border bg-black w-full flex justify-center"
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
    </div>
  );
}
