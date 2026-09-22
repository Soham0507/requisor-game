import { useState, useEffect, useRef, useCallback } from "react";
import {
  GestureRecognizer,
  FilesetResolver,
  GestureRecognizerResult,
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
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enableCamera: () => Promise<void>;
  disableCamera: () => void;
  error: string | null;
}

export function useGestureRecognizer(
  callbacks?: GestureCallbacks,
): UseGestureRecognizerReturn {
  const [isReady, setIsReady] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastFrameTimeRef = useRef<number>(0);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const FRAME_INTERVAL = isMobile ? 1000 / 3 : 1000 / 6;
  const currentGestureRef = useRef<string | null>(null);
  const confidenceRef = useRef<number>(0);
  const isShootGestureActiveRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    let mounted = true;

    async function initGestureRecognizer() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });

        if (mounted) {
          gestureRecognizerRef.current = recognizer;
          setIsReady(true);
        }
      } catch (err) {
        console.error("Failed to initialize gesture recognizer:", err);
        if (mounted) {
          setError("Failed to load gesture recognition");
        }
      }
    }

    initGestureRecognizer();

    return () => {
      mounted = false;
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
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
      const recognizer = gestureRecognizerRef.current;

      if (!video || !recognizer || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        try {
          const results: GestureRecognizerResult = recognizer.recognizeForVideo(
            video,
            video.currentTime * 1000,
          );

          if (
            results.gestures &&
            results.gestures.length > 0 &&
            results.gestures[0].length > 0
          ) {
            const gesture = results.gestures[0][0];
            const gestureName = gesture.categoryName;
            const gestureConfidence = gesture.score;

            if (gestureName !== currentGestureRef.current) {
              currentGestureRef.current = gestureName;
              setCurrentGesture(gestureName);
            }

            if (Math.abs(gestureConfidence - confidenceRef.current) > 0.05) {
              confidenceRef.current = gestureConfidence;
              setConfidence(gestureConfidence);
            }

            const isShootGesture =
              gestureName === "Closed_Fist" || gestureName === "Pointing_Up";

            if (isShootGesture && !isShootGestureActiveRef.current) {
              isShootGestureActiveRef.current = true;
              if (callbacksRef.current?.onGestureStart) {
                callbacksRef.current.onGestureStart(gestureName);
              }
            } else if (!isShootGesture && isShootGestureActiveRef.current) {
              isShootGestureActiveRef.current = false;
              if (callbacksRef.current?.onGestureEnd) {
                callbacksRef.current.onGestureEnd();
              }
            }
          } else {
            if (currentGestureRef.current !== null) {
              currentGestureRef.current = null;
              setCurrentGesture(null);
              setConfidence(0);
            }

            if (isShootGestureActiveRef.current) {
              isShootGestureActiveRef.current = false;
              if (callbacksRef.current?.onGestureEnd) {
                callbacksRef.current.onGestureEnd();
              }
            }
          }
        } catch (err) {
          console.error("Gesture recognition error:", err);
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    },
    [],
  );

  const enableCamera = useCallback(async () => {
    if (!gestureRecognizerRef.current) {
      setError("Gesture recognizer not ready");
      return;
    }

    try {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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

    isShootGestureActiveRef.current = false;
    setIsEnabled(false);
    setCurrentGesture(null);
    setConfidence(0);
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
    videoRef,
    canvasRef,
    enableCamera,
    disableCamera,
    error,
  };
}
