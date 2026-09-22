import { useEffect, useRef, useState, useCallback } from "react";

export interface HandLandmark { x: number; y: number; z: number; }

export interface HandData {
  x: number;
  y: number;
  isFist: boolean;
  isDetected: boolean;
  landmarks: HandLandmark[] | null;
}

declare global {
  interface Window {
    Hands: new (cfg: object) => MPHands;
  }
}

interface MPResults {
  multiHandLandmarks?: HandLandmark[][];
}

interface MPHands {
  setOptions(opts: object): void;
  onResults(cb: (r: MPResults) => void): void;
  send(data: { image: HTMLVideoElement }): Promise<void>;
}

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.crossOrigin = "anonymous";
    s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

// EMA smoother for jitter reduction
class EMA {
  value: number;
  alpha: number;
  constructor(init = 0.5, alpha = 0.18) { this.value = init; this.alpha = alpha; }
  update(v: number): number {
    this.value = this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }
}

// Better fist detection using tip-to-PIP distance ratios
function scoreFist(lm: HandLandmark[]): number {
  const fingers = [
    { tip: 8, pip: 6, mcp: 5 },
    { tip: 12, pip: 10, mcp: 9 },
    { tip: 16, pip: 14, mcp: 13 },
    { tip: 20, pip: 18, mcp: 17 },
  ];
  let folded = 0;
  for (const f of fingers) {
    // Tip is "curled" if it's closer to wrist than PIP joint is
    const tipY = lm[f.tip].y;
    const pipY = lm[f.pip].y;
    const mcpY = lm[f.mcp].y;
    // In image space, Y increases downward.
    // Finger is curled when tip is at or below PIP (or within 0.03 margin)
    if (tipY >= pipY - 0.03) folded++;
  }
  return folded; // 0 to 4
}

export function useHandGesture(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [handData, setHandData] = useState<HandData>({
    x: 0.5, y: 0.5, isFist: false, isDetected: false, landmarks: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handsRef = useRef<MPHands | null>(null);
  const rafRef = useRef<number>(0);
  const isRunning = useRef(false);
  const smoothX = useRef(new EMA(0.5, 0.18));
  const smoothY = useRef(new EMA(0.5, 0.18));
  // Hysteresis counters for stable fist detection
  const fistScore = useRef(0); // consecutive "fist" frames
  const openScore = useRef(0); // consecutive "open" frames
  const isFistStable = useRef(false);
  const FIST_ENTER = 5; // frames to enter fist state
  const FIST_EXIT = 4;  // frames to exit fist state

  const processFrame = useCallback(async () => {
    if (!isRunning.current || !handsRef.current || !videoRef.current) return;
    try {
      await handsRef.current.send({ image: videoRef.current });
    } catch { /* ignore frame errors */ }
    rafRef.current = requestAnimationFrame(processFrame);
  }, [videoRef]);

  const start = useCallback(async () => {
    if (isRunning.current) return;
    setIsLoading(true);
    setError(null);
    try {
      await loadScript(`${CDN}/hands.js`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const hands = new window.Hands({
        locateFile: (f: string) => `${CDN}/${f}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.6,
      });

      hands.onResults((results: MPResults) => {
        const lmArr = results.multiHandLandmarks?.[0];
        if (lmArr && lmArr.length === 21) {
          // Palm centre (average of wrist + MCP joints)
          const palmX = (lmArr[0].x + lmArr[5].x + lmArr[9].x + lmArr[13].x + lmArr[17].x) / 5;
          const palmY = (lmArr[0].y + lmArr[5].y + lmArr[9].y + lmArr[13].y + lmArr[17].y) / 5;

          const sx = smoothX.current.update(1 - palmX); // mirror X
          const sy = smoothY.current.update(palmY);

          // Hysteresis fist detection
          const fs = scoreFist(lmArr);
          if (fs >= 3) { fistScore.current++; openScore.current = 0; }
          else { openScore.current++; fistScore.current = 0; }
          if (!isFistStable.current && fistScore.current >= FIST_ENTER) isFistStable.current = true;
          if (isFistStable.current && openScore.current >= FIST_EXIT) isFistStable.current = false;

          setHandData({
            x: sx, y: sy,
            isFist: isFistStable.current,
            isDetected: true,
            landmarks: lmArr,
          });
        } else {
          fistScore.current = 0; openScore.current = 0;
          setHandData(prev => ({ ...prev, isDetected: false, landmarks: null }));
        }
      });

      handsRef.current = hands;
      isRunning.current = true;
      setIsLoading(false);
      rafRef.current = requestAnimationFrame(processFrame);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("Permission") || msg.includes("NotAllowed")
        ? "Camera permission denied. Please allow camera access and try again."
        : "Failed to start hand tracking. Check that your browser supports WebRTC.");
      setIsLoading(false);
    }
  }, [videoRef, processFrame]);

  const stop = useCallback(() => {
    isRunning.current = false;
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [videoRef]);

  useEffect(() => () => stop(), [stop]);

  return { handData, isLoading, error, start, stop };
}
