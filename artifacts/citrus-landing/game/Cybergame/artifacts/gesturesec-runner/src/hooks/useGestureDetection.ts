import { useEffect, useRef, useState, useCallback } from "react";

interface GestureState {
  detectedFingers: number | null;
  confirmedFingers: number | null;
  isConfirming: boolean;
  confirmProgress: number; // 0-100
}

interface UseGestureDetectionOptions {
  onConfirm?: (fingers: number) => void;
  confirmDelay?: number; // ms
  enabled?: boolean;
}

// Dynamically load a script tag once
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// Count extended fingers from MediaPipe landmarks
function countFingers(landmarks: Array<{ x: number; y: number; z: number }>): number {
  if (!landmarks || landmarks.length === 0) return 0;

  // [tip, pip] for index, middle, ring, pinky
  const fingerPairs: [number, number][] = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];

  // Thumb: tip x < ip x (for right hand, mirrored from selfie cam)
  const thumbExtended = landmarks[4].x < landmarks[3].x;
  let count = thumbExtended ? 1 : 0;

  for (const [tip, pip] of fingerPairs) {
    if (landmarks[tip].y < landmarks[pip].y) {
      count++;
    }
  }

  return Math.min(count, 4);
}

function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }>,
  width: number,
  height: number
) {
  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];

  ctx.strokeStyle = "rgba(0, 255, 150, 0.8)";
  ctx.lineWidth = 2;

  for (const [start, end] of connections) {
    const s = landmarks[start];
    const e = landmarks[end];
    // Mirror x
    ctx.beginPath();
    ctx.moveTo((1 - s.x) * width, s.y * height);
    ctx.lineTo((1 - e.x) * width, e.y * height);
    ctx.stroke();
  }

  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc((1 - lm.x) * width, lm.y * height, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 255, 150, 1)";
    ctx.fill();
  }
}

export function useGestureDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseGestureDetectionOptions = {}
) {
  const { onConfirm, confirmDelay = 1000, enabled = true } = options;

  const [state, setState] = useState<GestureState>({
    detectedFingers: null,
    confirmedFingers: null,
    isConfirming: false,
    confirmProgress: 0,
  });

  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFingerCountRef = useRef<number | null>(null);
  const confirmStartRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const onConfirmRef = useRef(onConfirm);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    confirmStartRef.current = null;
  }, []);

  const startConfirmTimer = useCallback(
    (fingers: number) => {
      clearConfirmTimer();
      confirmStartRef.current = Date.now();

      setState((prev) => ({ ...prev, isConfirming: true, confirmProgress: 0 }));

      progressIntervalRef.current = setInterval(() => {
        if (!confirmStartRef.current) return;
        const elapsed = Date.now() - confirmStartRef.current;
        const progress = Math.min((elapsed / confirmDelay) * 100, 100);
        setState((prev) => ({ ...prev, confirmProgress: progress }));
      }, 50);

      confirmTimerRef.current = setTimeout(() => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          confirmedFingers: fingers,
          isConfirming: false,
          confirmProgress: 100,
        }));
        onConfirmRef.current?.(fingers);
      }, confirmDelay);
    },
    [clearConfirmTimer, confirmDelay]
  );

  useEffect(() => {
    if (!enabled) {
      clearConfirmTimer();
      return;
    }

    let isMounted = true;
    let streamRef: MediaStream | null = null;

    async function initMediaPipe() {
      try {
        // Load MediaPipe scripts from CDN
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        );

        if (!isMounted) return;

        // Access globals injected by the CDN scripts
        const { Hands, Camera } = window as any;

        if (!Hands || !Camera) {
          console.error("MediaPipe not available on window");
          return;
        }

        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          if (!isMounted || !enabledRef.current) return;

          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw mirrored video
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          if (results.multiHandLandmarks?.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const fingerCount = countFingers(landmarks);

            drawHandSkeleton(ctx, landmarks, canvas.width, canvas.height);

            if (fingerCount >= 1 && fingerCount <= 4) {
              if (lastFingerCountRef.current !== fingerCount) {
                lastFingerCountRef.current = fingerCount;
                setState((prev) => ({
                  ...prev,
                  detectedFingers: fingerCount,
                  isConfirming: false,
                  confirmProgress: 0,
                }));
                startConfirmTimer(fingerCount);
              }
            } else {
              if (lastFingerCountRef.current !== null) {
                lastFingerCountRef.current = null;
                clearConfirmTimer();
                setState((prev) => ({
                  ...prev,
                  detectedFingers: null,
                  isConfirming: false,
                  confirmProgress: 0,
                }));
              }
            }
          } else {
            if (lastFingerCountRef.current !== null) {
              lastFingerCountRef.current = null;
              clearConfirmTimer();
              setState((prev) => ({
                ...prev,
                detectedFingers: null,
                isConfirming: false,
                confirmProgress: 0,
              }));
            }
          }
        });

        handsRef.current = hands;

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current && isMounted) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraRef.current = camera;
        }
      } catch (err) {
        console.error("MediaPipe init error:", err);
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      clearConfirmTimer();
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch {}
        cameraRef.current = null;
      }
      if (handsRef.current) {
        try { handsRef.current.close(); } catch {}
        handsRef.current = null;
      }
      if (streamRef) {
        streamRef.getTracks().forEach((t) => t.stop());
        streamRef = null;
      }
    };
  }, [enabled, videoRef, canvasRef, clearConfirmTimer, startConfirmTimer]);

  const reset = useCallback(() => {
    clearConfirmTimer();
    lastFingerCountRef.current = null;
    setState({
      detectedFingers: null,
      confirmedFingers: null,
      isConfirming: false,
      confirmProgress: 0,
    });
  }, [clearConfirmTimer]);

  return { ...state, reset };
}
