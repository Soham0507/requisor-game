import { useState, useEffect, useRef, useCallback } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  PoseLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

interface GestureCallbacks {
  onGestureStart?: (gesture: string) => void;
  onGestureEnd?: () => void;
}

interface UseGestureRecognizerReturn {
  isReady: boolean;
  isEnabled: boolean;
  currentGesture: string | null;
  confidence: number;
  kneeAngle: number | null;
  activeLeg: "left" | "right" | null;
  landmarks: NormalizedLandmark[] | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enableCamera: () => Promise<void>;
  disableCamera: () => void;
  error: string | null;
}

const RIGHT_HIP = 24;
const RIGHT_KNEE = 26;
const RIGHT_ANKLE = 28;
const LEFT_HIP = 23;
const LEFT_KNEE = 25;
const LEFT_ANKLE = 27;

const KICK_THRESHOLD = 140;
const GOAL_ANGLE_MIN = 150;
const GOAL_ANGLE_MAX = 170;
const MIN_LANDMARK_VISIBILITY = 0.3;
const COOLDOWN_MS = 2000;

function calculateAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };

  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);

  if (magAB === 0 || magCB === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  const angle = Math.acos(cosAngle);
  return (angle * 180) / Math.PI;
}

function areLandmarksVisible(
  landmarks: NormalizedLandmark[],
  indices: number[],
  minVisibility: number,
): boolean {
  return indices.every((i) => {
    const lm = landmarks[i];
    return lm && (lm.visibility ?? 0) >= minVisibility;
  });
}

export function useGestureRecognizer(
  callbacks?: GestureCallbacks,
): UseGestureRecognizerReturn {
  const [isReady, setIsReady] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [kneeAngle, setKneeAngle] = useState<number | null>(null);
  const [activeLeg, setActiveLeg] = useState<"left" | "right" | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastFrameTimeRef = useRef<number>(0);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const FRAME_INTERVAL = isMobile ? 1000 / 5 : 1000 / 10;

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const lastKickTimeRef = useRef<number>(0);
  const wasExtendedRef = useRef(false);
  const gestureEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initPoseLandmarker() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );

        const pose = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (mounted) {
          poseLandmarkerRef.current = pose;
          setIsReady(true);
        }
      } catch (err) {
        console.error("Failed to initialize pose landmarker:", err);
        if (mounted) {
          setError("Failed to load pose detection");
        }
      }
    }

    initPoseLandmarker();

    return () => {
      mounted = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, []);

  const processFrame = useCallback(
    (timestamp: number) => {
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < FRAME_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTimeRef.current = timestamp - (elapsed % FRAME_INTERVAL);

      const video = videoRef.current;
      const poseLandmarker = poseLandmarkerRef.current;

      if (!video || !poseLandmarker || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (video.currentTime === lastVideoTimeRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastVideoTimeRef.current = video.currentTime;

      try {
        const results: PoseLandmarkerResult = poseLandmarker.detectForVideo(
          video,
          timestamp,
        );

        if (
          results.landmarks &&
          results.landmarks.length > 0 &&
          results.landmarks[0].length > RIGHT_ANKLE
        ) {
          const lms = results.landmarks[0];
          setLandmarks([...lms]);

          let bestAngle = 0;
          let detectedLeg: "right" | "left" | null = null;

          if (
            areLandmarksVisible(
              lms,
              [RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE],
              MIN_LANDMARK_VISIBILITY,
            )
          ) {
            const rightAngle = calculateAngle(
              lms[RIGHT_HIP],
              lms[RIGHT_KNEE],
              lms[RIGHT_ANKLE],
            );
            if (rightAngle > bestAngle) {
              bestAngle = rightAngle;
              detectedLeg = "right";
            }
          }

          if (
            areLandmarksVisible(
              lms,
              [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE],
              MIN_LANDMARK_VISIBILITY,
            )
          ) {
            const leftAngle = calculateAngle(
              lms[LEFT_HIP],
              lms[LEFT_KNEE],
              lms[LEFT_ANKLE],
            );
            if (leftAngle > bestAngle) {
              bestAngle = leftAngle;
              detectedLeg = "left";
            }
          }

          if (detectedLeg === null) {
            setKneeAngle(null);
            setActiveLeg(null);
            setCurrentGesture(null);
            setConfidence(0);
            wasExtendedRef.current = false;
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }

          const angle = Math.round(bestAngle);
          setKneeAngle(angle);
          setActiveLeg(detectedLeg);

          const now = Date.now();
          const inCooldown = now - lastKickTimeRef.current < COOLDOWN_MS;

          if (angle >= KICK_THRESHOLD && !wasExtendedRef.current && !inCooldown) {
            wasExtendedRef.current = true;
            lastKickTimeRef.current = now;

            const isGoal = angle >= GOAL_ANGLE_MIN && angle <= GOAL_ANGLE_MAX;
            const gestureName = isGoal ? "goal" : "miss";

            setCurrentGesture(gestureName);
            setConfidence(1);

            callbacksRef.current?.onGestureStart?.(gestureName);

            if (gestureEndTimerRef.current) {
              clearTimeout(gestureEndTimerRef.current);
            }
            gestureEndTimerRef.current = setTimeout(() => {
              setCurrentGesture(null);
              setConfidence(0);
              callbacksRef.current?.onGestureEnd?.();
              gestureEndTimerRef.current = null;
            }, 500);
          }

          if (angle < KICK_THRESHOLD - 20) {
            wasExtendedRef.current = false;
          }
        } else {
          setLandmarks(null);
          setKneeAngle(null);
          setCurrentGesture(null);
          setConfidence(0);
          wasExtendedRef.current = false;
        }
      } catch (err) {
        console.error("Pose detection error:", err);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    },
    [],
  );

  const enableCamera = useCallback(async () => {
    if (!poseLandmarkerRef.current) {
      setError("Pose landmarker not ready");
      return;
    }

    if (animationFrameRef.current !== null || streamRef.current !== null) {
      return;
    }

    try {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
        navigator.userAgent,
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobileDevice ? 160 : 320 },
          height: { ideal: isMobileDevice ? 120 : 240 },
          facingMode: "user",
          frameRate: { ideal: isMobileDevice ? 15 : 30 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsEnabled(true);
        setError(null);
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied");
    }
  }, [processFrame]);

  const disableCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (gestureEndTimerRef.current) {
      clearTimeout(gestureEndTimerRef.current);
      gestureEndTimerRef.current = null;
    }
    wasExtendedRef.current = false;
    lastKickTimeRef.current = 0;
    setIsEnabled(false);
    setCurrentGesture(null);
    setConfidence(0);
    setKneeAngle(null);
    setActiveLeg(null);
    setLandmarks(null);
  }, []);

  useEffect(() => {
    return () => {
      disableCamera();
    };
  }, [disableCamera]);

  return {
    isReady,
    isEnabled,
    currentGesture,
    confidence,
    kneeAngle,
    activeLeg,
    landmarks,
    videoRef,
    canvasRef,
    enableCamera,
    disableCamera,
    error,
  };
}
