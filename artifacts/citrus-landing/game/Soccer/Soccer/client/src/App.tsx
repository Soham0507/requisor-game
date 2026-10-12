import React, { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  startAmbience,
  stopAmbience,
  playCrowdCheer,
  playMissGroan,
  playSwoosh,
  playBuzzer,
  toggleMute,
  getIsMuted,
  initAudio,
} from "./sounds";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Trophy,
  Activity,
  Clock,
  ChevronRight,
  Shield,
  Lock,
  Zap,
  BarChart3,
  RefreshCcw,
  AlertCircle,
  X,
  Camera,
  CameraOff,
  Hand,
} from "lucide-react";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";

import type { Score, InsertScore } from "@shared/schema";
import { Route, Switch } from "wouter";
import { useBrand } from "./brand-bridge";

import DisplayLeaderboard from "./pages/DisplayLeaderboard";

/** A custom landing-screen background can be an image or a video — the customizer does not track which, so sniff it from the data: URI mime type or file extension. */
function isBgVideo(url: string): boolean {
  return url.startsWith("data:video") || /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      retry: false,
    },
    mutations: {
      networkMode: "always",
      retry: false,
    },
  },
});

// --- Types ---

type ScreenState = "home" | "game" | "results" | "leaderboard";

interface GameStats {
  score: number;
  shotsTaken: number;
  shotsMade: number;
  outagesPrevented: number;
}

// --- Components ---

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  size = "md",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "outline"
    | "brand-gradient"
    | "none";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
    "brand-gradient":
      "bg-gradient-brand text-white hover:opacity-90 shadow-lg shadow-primary/25 border border-white/10",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
    accent:
      "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20",
    outline:
      "bg-transparent border border-white/20 text-white hover:bg-white/5",
    none: "",
  };

  const sizes = {
    sm: "px-5 py-2 text-sm",
    md: "px-7 py-3 text-base",
    lg: "px-9 py-4 text-lg font-semibold",
    xl: "px-12 py-5 text-xl font-bold tracking-wide",
  };

  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-50 grayscale" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function Logo() {
  const brand = useBrand();
  return (
    <div className="flex items-center absolute left-[45%]">
      {brand.logoUrl ? (
        <img
          src={brand.logoUrl}
          alt={brand.brandName}
          className="mr-2 object-contain"
          style={{ width: brand.logoSize, height: brand.logoSize }}
        />
      ) : (
        <div
          className="mr-2 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            width: brand.logoSize,
            height: brand.logoSize,
            background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.primaryColor}66)`,
          }}
        >
          <ImageIcon className="text-white/80" size={Math.round(brand.logoSize * 0.55)} />
        </div>
      )}
    </div>
  );
}

// --- Leaderboard Ticker ---
const LeaderboardTicker = () => {
  const { data: leaderboard = [] } = useQuery<Score[]>({
    queryKey: ["/api/scores", { limit: 20 }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("avx-leaderboard");
        if (cached) return JSON.parse(cached);
        return [];
      }
      try {
        const res = await fetch("/api/scores?limit=20");
        if (!res.ok) throw new Error("Failed to fetch scores");
        const data = await res.json();
        localStorage.setItem("avx-leaderboard", JSON.stringify(data));
        return data;
      } catch {
        const cached = localStorage.getItem("avx-leaderboard");
        if (cached) return JSON.parse(cached);
        return [];
      }
    },
    refetchInterval: 15000,
    retry: false,
  });

  if (leaderboard.length === 0) return null;

  const items = [...leaderboard, ...leaderboard];

  return (
    <div
      className="w-full bg-transparent overflow-hidden relative z-50"
      data-testid="leaderboard-ticker"
    >
      <div className="absolute inset-0  pointer-events-none" />
      <div className="flex items-center h-13">
        <div className="shrink-0 h-full flex items-center gap-2 px-6 z-10 ">
          <Trophy size={25} className="text-[#FFBF40]" />
          <span className="text-2xl font-semibold uppercase tracking-[0.15em] text-white" style={
            { fontFamily: "Video Med" }
          } >
            Live
          </span>
        </div>
        <div className="overflow-hidden flex-1 relative rounded-full">
          <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none " />
          <div
            className="flex items-center gap-7 whitespace-nowrap py-2 px-8"
            style={{
              animation: `ticker ${Math.max(leaderboard.length * 4, 20)}s linear infinite`,
              willChange: "transform",
              fontFamily: "Video Med"
            }}
          >
            {items.map((player, i) => {
              const rank = (i % leaderboard.length) + 1;
              const isTop3 = rank <= 3;
              return (
                <span
                  key={`${player.id}-${i}`}
                  className="inline-flex items-center gap-3 text-4xl shrink-0"
                >
                  <span
                    className={`text-3xl ${isTop3 ? "text-[#FFBF40]" : "text-[#3A6CD0]"}`}
                    style={{ fontFamily: "Video Med" }}
                  >
                    {rank}
                  </span>
                  <span
                    className={
                      isTop3
                        ? "font-medium  text-3xl text-white/80"
                        : "text-white/40 text-2xl"
                    }
                  >
                    {player.playerName}
                  </span>
                  <span
                    className={`font-bold text-3xl ${isTop3 ? "text-[#FFBF40]/90" : "text-white/30"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {player.score}
                  </span>
                  <span className="w-px h-5 bg-white/[0.06] mx-2" />
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Peak brand motif: directional arrow extracted from the "A" in PEAK ---
const PeakArrow = ({
  size = 24,
  color = "#E42E20",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
    data-testid="peak-arrow"
  >
    <path
      d="M2 20 L12 4 L22 20 L17 20 L12 12 L7 20 Z"
      fill={color}
    />
  </svg>
);

// --- Screens ---

const HomeScreen = ({
  onStart,
  onLeaderboard,
}: {
  onStart: () => void;
  onLeaderboard: () => void;
}) => {
  const brand = useBrand();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-screen overflow-hidden relative z-10 flex flex-col items-center justify-center"
    >
      {/* Peak yellow brand tint over background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,191,64,0.55) 0%, rgba(255,191,64,0.18) 38%, rgba(28,28,28,0.35) 75%, rgba(28,28,28,0.55) 100%)",
        }}
      />

      {/* Brand Label */}
      <div
        className="absolute top-[12vh] [@media(max-height:560px)]:top-[3vh] left-1/2 -translate-x-1/2 text-center z-10"
        data-testid="brand-label-home"
      >
        <h1
          className="text-5xl md:text-7xl lg:text-8xl [@media(max-height:560px)]:text-4xl [@media(max-height:560px)]:md:text-5xl leading-none"
          style={{
            fontFamily: "var(--brand-font, 'Big Shoulders Display'), 'Inter', sans-serif",
            fontWeight: 900,
            color: brand.headingColor,
            letterSpacing: "0.02em",
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
          }}
        >
          {brand.heading.toUpperCase()}
        </h1>
        <div
          className="mt-4 text-sm md:text-base tracking-[0.35em] uppercase"
          style={{ color: "#FFFFFF", fontWeight: 600, opacity: 0.92 }}
        >
          Beat the clock. Master the moment. Win like a pro.
        </div>
      </div>

      {/* Center Content */}
      <div className="relative flex items-center justify-center">
        {/* Video */}
        <video
          src={`${import.meta.env.BASE_URL}bbn/Rock_rotation-large1500px-Alpha.webm`}
          autoPlay
          loop
          muted
          playsInline
          className="w-[500px] md:w-[600px] lg:w-[700px] opacity-50 object-contain"
        />
      </div>

      {/* Bottom Buttons */}
      <div
        className="absolute bottom-[60px] [@media(max-height:560px)]:bottom-3 flex flex-col md:flex-row [@media(max-height:560px)]:flex-row items-center gap-4 [@media(max-height:560px)]:gap-2 z-1"
        style={{
          letterSpacing: "20px",
          fontFamily: "inter Bold",
        }}
      >
        <button
          onClick={onStart}
          className="h-14 w-[280px] [@media(max-height:560px)]:h-10 [@media(max-height:560px)]:w-[190px] [@media(max-height:560px)]:text-base text-xl tracking-widest hover:scale-105 active:scale-90 transition-transform rounded-md animate-btn-glow"
          style={{
            backgroundColor: brand.primaryColor,
            color: "#FFFFFF",
            border: "3px solid #1C1C1C",
            fontWeight: 800,
            letterSpacing: "20px",
            fontFamily: "'Inter', sans-serif",
          }}
          data-testid="button-play"
        >
          <span style={{ letterSpacing: "20px", paddingLeft: "20px" }}>Play</span>
        </button>

        <button
          onClick={onLeaderboard}
          className="h-14 w-[280px] [@media(max-height:560px)]:h-10 [@media(max-height:560px)]:w-[190px] [@media(max-height:560px)]:text-base text-xl tracking-widest hover:scale-105 active:scale-90 transition-transform rounded-md"
          style={{
            backgroundColor: "#FFBF40",
            color: "#1C1C1C",
            border: "3px solid #1C1C1C",
            fontWeight: 800,
            letterSpacing: "20px",
            fontFamily: "'Inter', sans-serif",
          }}
          data-testid="button-leaderboard"
        >
          <span style={{ letterSpacing: "8px" }}>Leaderboard</span>
        </button>
      </div>
    </motion.div>
  );
};

const TUTORIAL_STEPS = [
  { image: `${import.meta.env.BASE_URL}ball/step1.png` },
  { image: `${import.meta.env.BASE_URL}ball/step2.png` },
  { image: `${import.meta.env.BASE_URL}ball/step3.png` },
];

function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const currentStep = TUTORIAL_STEPS[step];

  const iconMap: Record<string, React.ReactNode> = {
    trophy: <Trophy size={28} className="text-yellow-400" />,
    zap: <Zap size={28} className="text-green-400" />,
    shield: <Shield size={28} className="text-purple-400" />,
    clock: <Clock size={28} className="text-red-400" />,
    hand: <Hand size={28} className="text-blue-400" />,
  };

  const handleNext = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  useEffect(() => {
    const highlight = (currentStep as any).highlight;
    if (highlight) {
      const el = document.querySelector(`[data-testid="${highlight}"]`);
      if (el) {
        el.classList.add("tutorial-highlight");
        return () => el.classList.remove("tutorial-highlight");
      }
    }
  }, [step, currentStep]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="tutorial-overlay"
    >
      <div className="absolute inset-0 bg-black/80" onClick={handleSkip} />

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 max-w-sm w-full mx-4 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <div
          className="backdrop-blur-xl rounded-2xl p-3 flex flex-col overflow-hidden"
          style={{ maxHeight: "90vh", backgroundColor: "#1C1C1C", border: "3px solid #FFBF40" }}
        >
          <div
            className="mb-3 rounded-lg overflow-hidden flex-1 min-h-0"
            style={{ border: "2px solid #FFBF40" }}
          >
            <img
              src={(currentStep as any).image}
              alt={`Step ${step + 1}`}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center gap-3 mb-3 shrink-0">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all"
                style={{ backgroundColor: i <= step ? "#E42E20" : "#FFBF40" }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between shrink-0">
            <button
              onClick={handleSkip}
              className="text-xs transition-colors uppercase tracking-wider font-semibold"
              style={{ color: "#E42E20" }}
              data-testid="button-skip-tutorial"
            >
              Skip
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg font-bold text-sm"
              style={{
                backgroundColor: "#E42E20",
                color: "#FFFFFF",
                border: "2px solid #1C1C1C",
                fontFamily: "'Inter', sans-serif",
              }}
              data-testid="button-next-tutorial"
            >
              {step < TUTORIAL_STEPS.length - 1 ? "Next" : "Let's Go!"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const HIT_VIDEO = `${import.meta.env.BASE_URL}soccer/hit2.mp4`;
const MISS_VIDEO = `${import.meta.env.BASE_URL}soccer/miss1.mp4`;

function usePreloadedVideos(urls: string[]) {
  const blobUrlsRef = useRef<Record<string, string>>({});
  const videoElsRef = useRef<HTMLVideoElement[]>([]);
  useEffect(() => {
    const map = blobUrlsRef.current;
    const els: HTMLVideoElement[] = [];
    urls.forEach((url) => {
      if (map[url]) return;
      fetch(url)
        .then((r) => r.blob())
        .then((blob) => {
          map[url] = URL.createObjectURL(blob);
        })
        .catch(() => {
          map[url] = url;
        });
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.src = url;
      v.load();
      els.push(v);
    });
    videoElsRef.current = els;
    return () => {
      Object.values(map).forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
      blobUrlsRef.current = {};
      els.forEach((v) => {
        v.src = "";
        v.load();
      });
    };
  }, []);
  return (originalUrl: string) =>
    blobUrlsRef.current[originalUrl] || originalUrl;
}

const GameScreen = ({
  onEndRound,
  updateStats,
}: {
  onEndRound: () => void;
  updateStats: (made: boolean) => void;
}) => {
  const resolveVideo = usePreloadedVideos([HIT_VIDEO, MISS_VIDEO]);
  const [soundMuted, setSoundMuted] = useState(() => getIsMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [timeLeft, setTimeLeft] = useState(47);
  const [score, setScore] = useState(0);
  const [isShooting, setIsShooting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const shotVideoRef = React.useRef<HTMLVideoElement>(null);
  const [showShotVideo, setShowShotVideo] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const shotResultRef = React.useRef<"score" | "miss" | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const missTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const videoTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const shootingRef = React.useRef(false);
  const isPerfectShotRef = React.useRef(false);
  const [shotResult, setShotResult] = useState<"score" | "miss" | null>(null);

  const poseCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleShotVideoEnded = useCallback(() => {
    if (videoTimeoutRef.current) {
      clearTimeout(videoTimeoutRef.current);
      videoTimeoutRef.current = null;
    }
    if (missTimerRef.current) {
      clearTimeout(missTimerRef.current);
      missTimerRef.current = null;
    }
    if (!shootingRef.current) return;
    const result = shotResultRef.current;
    const wasPerfect = isPerfectShotRef.current;

    if (result === "score") {
      setScore((s) => s + 3);
      setFeedback(wasPerfect ? "Swish!" : "Score!");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
      updateStats(true);
      playCrowdCheer();
    } else if (result === "miss") {
      setFeedback("Miss!");
      updateStats(false);
      playMissGroan();
    }

    const isMiss = result === "miss";

    setIsFadingOut(true);

    setTimeout(
      () => {
        setShowShotVideo(false);
        setIsFadingOut(false);
        if (shotVideoRef.current) {
          shotVideoRef.current.pause();
          shotVideoRef.current.currentTime = 0;
        }

        if (wasPerfect) {
          isPerfectShotRef.current = false;
        }

        setTimeout(
          () => {
            shootingRef.current = false;
            setIsShooting(false);
            setFeedback(null);
            setShotResult(null);
            shotResultRef.current = null;
          },
          isMiss ? 1200 : 300,
        );
      },
      isMiss ? 800 : 500,
    );
  }, [updateStats]);

  const startVideoTimeout = useCallback(() => {
    if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);
    videoTimeoutRef.current = setTimeout(() => {
      if (shootingRef.current) {
        handleShotVideoEnded();
      }
    }, 12000);
  }, [handleShotVideoEnded]);

  const playShotVideo = useCallback(
    (src: string) => {
      if (!shotVideoRef.current) return;
      shotVideoRef.current.src = resolveVideo(src);
      shotVideoRef.current.currentTime = 0;
      shotVideoRef.current.playbackRate = 1;
      shotVideoRef.current.muted = getIsMuted();
      shotVideoRef.current.play().catch(() => {
        handleShotVideoEnded();
      });
      startVideoTimeout();
    },
    [handleShotVideoEnded, startVideoTimeout, resolveVideo],
  );

  const handleKickShot = useCallback(
    (gesture: string) => {
      if (shootingRef.current) return;
      shootingRef.current = true;

      const isGoal = gesture === "goal";

      setShotResult(isGoal ? "score" : "miss");
      shotResultRef.current = isGoal ? "score" : "miss";
      isPerfectShotRef.current = isGoal;
      setIsShooting(true);
      setShowShotVideo(true);
      playSwoosh();

      if (isGoal) {
        playShotVideo(HIT_VIDEO);
      } else {
        playShotVideo(MISS_VIDEO);
      }
    },
    [playShotVideo],
  );

  const gestureCallbacks = React.useMemo(
    () => ({
      onGestureStart: (gesture: string) => {
        if (!shootingRef.current) {
          handleKickShot(gesture);
        }
      },
      onGestureEnd: () => {},
    }),
    [handleKickShot],
  );

  const {
    isReady: gestureReady,
    isEnabled: cameraEnabled,
    currentGesture,
    kneeAngle,
    activeLeg,
    landmarks,
    videoRef,
    enableCamera,
    disableCamera,
    error: gestureError,
  } = useGestureRecognizer(gestureCallbacks);

  useEffect(() => {
    const canvas = poseCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !landmarks) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ✅ Sync canvas with actual video resolution (fix distortion)
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // ✅ Smoothing (anti-jitter)
    const smooth = (prev: any, curr: any, alpha = 0.6) => {
      if (!prev) return curr;
      return {
        x: prev.x * alpha + curr.x * (1 - alpha),
        y: prev.y * alpha + curr.y * (1 - alpha),
        visibility: curr.visibility,
      };
    };

    // store previous frame
    if (!window.__prevLandmarks) window.__prevLandmarks = [];

    const smoothed = landmarks.map((lm: any, i: number) => {
      if (!lm || lm.visibility < 0.5) return null; // ✅ filter low confidence
      const prev = window.__prevLandmarks[i];
      const s = smooth(prev, lm);
      window.__prevLandmarks[i] = s;
      return s;
    });

    const w = width;
    const h = height;

    // ✅ Connections
    const POSE_CONNECTIONS = [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [25, 27],
      [24, 26],
      [26, 28],
      [27, 29],
      [28, 30],
      [29, 31],
      [30, 32],
    ];

    const rightLeg = new Set([24, 26, 28, 30, 32]);
    const leftLeg = new Set([23, 25, 27, 29, 31]);
    const kickSet = activeLeg === "right" ? rightLeg : leftLeg;

    // ✅ Draw skeleton
    ctx.lineWidth = 3;

    for (const [a, b] of POSE_CONNECTIONS) {
      const la = smoothed[a];
      const lb = smoothed[b];
      if (!la || !lb) continue;

      const isKick = kickSet.has(a) && kickSet.has(b);

      ctx.strokeStyle = isKick ? "#22C55E" : "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(la.x * w, la.y * h);
      ctx.lineTo(lb.x * w, lb.y * h);
      ctx.stroke();
    }

    // ✅ Draw joints
    for (let i = 0; i < smoothed.length; i++) {
      const lm = smoothed[i];
      if (!lm) continue;

      const isKick = kickSet.has(i);

      ctx.fillStyle = isKick ? "#4ADE80" : "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, isKick ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ✅ Draw angle arc (MUCH better than just text)
    const hipIdx = activeLeg === "right" ? 24 : 23;
    const kneeIdx = activeLeg === "right" ? 26 : 25;
    const ankleIdx = activeLeg === "right" ? 28 : 27;

    const hip = smoothed[hipIdx];
    const knee = smoothed[kneeIdx];
    const ankle = smoothed[ankleIdx];

    if (hip && knee && ankle && kneeAngle !== null) {
      const kx = knee.x * w;
      const ky = knee.y * h;

      const angleColor =
        kneeAngle >= 155 && kneeAngle <= 165
          ? "#22C55E" // perfect
          : kneeAngle > 140
            ? "#F59E0B" // okay
            : "#EF4444"; // bad

      // draw arc
      ctx.strokeStyle = angleColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(kx, ky, 25, 0, (kneeAngle * Math.PI) / 180);
      ctx.stroke();

      // draw angle text
      ctx.fillStyle = angleColor;
      ctx.font = "bold 12px monospace";
      ctx.fillText(`${Math.round(kneeAngle)}°`, kx + 10, ky - 10);
    }

    // ✅ Optional: show kick direction arrow
    const ankleIdxDir = activeLeg === "right" ? 28 : 27;
    const kneeIdxDir = activeLeg === "right" ? 26 : 25;

    const ankleDir = smoothed[ankleIdxDir];
    const kneeDir = smoothed[kneeIdxDir];

    if (ankleDir && kneeDir) {
      const dx = (ankleDir.x - kneeDir.x) * w;
      const dy = (ankleDir.y - kneeDir.y) * h;

      ctx.strokeStyle = "rgba(34,197,94,0.7)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(kneeDir.x * w, kneeDir.y * h);
      ctx.lineTo(kneeDir.x * w + dx * 1.5, kneeDir.y * h + dy * 1.5);
      ctx.stroke();
    }
  }, [landmarks, kneeAngle, activeLeg]);
  useEffect(() => {
    startAmbience();
    return () => {
      if (missTimerRef.current) clearTimeout(missTimerRef.current);
      stopAmbience();
    };
  }, []);

  useEffect(() => {
    if (gestureReady && !cameraEnabled) {
      enableCamera();
    }
  }, [gestureReady, cameraEnabled, enableCamera]);

  useEffect(() => {
    if (gameEnded) {
      if (missTimerRef.current) {
        clearTimeout(missTimerRef.current);
        missTimerRef.current = null;
      }
      playBuzzer();
      stopAmbience();
      onEndRound();
    }
  }, [gameEnded, onEndRound]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
  }, []);

  useEffect(() => {
    if (showTutorial) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showTutorial]);

  useEffect(() => {
    return () => {
      if (shotVideoRef.current) {
        shotVideoRef.current.pause();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full relative z-10 w-full mx-auto p-0"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          opacity: showShotVideo && videoReady && !isFadingOut ? 0 : 1,
          transition: "opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <video
          src={`${import.meta.env.BASE_URL}soccer/position.mp4`}
          autoPlay
          loop
          muted
          playsInline
          poster={`${import.meta.env.BASE_URL}newbb/position-bg.jpg`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <video
        ref={shotVideoRef}
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-[5]"
        style={{
          opacity: showShotVideo && videoReady && !isFadingOut ? 1 : 0,
          transition: "opacity 800ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: "none",
        }}
        onCanPlay={() => setVideoReady(true)}
        onEnded={handleShotVideoEnded}
        onError={handleShotVideoEnded}
      />

      <button
        onClick={() => {
          const muted = toggleMute();
          setSoundMuted(muted);
          if (shotVideoRef.current) {
            shotVideoRef.current.muted = muted;
          }
        }}
        className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors"
        data-testid="button-mute"
      >
        {soundMuted ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>

      <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto p-4 md:p-5 lg:p-6">
        {/* Game Area */}
        <div className="flex-1 relative flex flex-col items-center min-h-[350px]">
          {/* Kick Status + Power Bar - Left Side */}
          {kneeAngle !== null && (
            <div
              className="fixed left-4 md:left-6 lg:left-8 bottom-1/4 z-40 flex items-end gap-3"
              data-testid="kick-status"
            >
              {/* Vertical Power Bar */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="peak-bracket text-[10px] font-black text-[#FFBF40] uppercase tracking-[0.25em]"
                  style={{ textShadow: "0 0 8px rgba(0,0,0,0.8)" }}
                >
                  Power
                </div>
                <div
                  className="panel-dark relative w-7 h-56 rounded-lg overflow-hidden"
                  style={{
                    boxShadow:
                      "inset 0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)",
                  }}
                  data-testid="power-bar"
                >
                  {/* Goal zone band (150-170°) — Peak yellow */}
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      bottom: `${((150 - 90) / 90) * 100}%`,
                      height: `${((170 - 150) / 90) * 100}%`,
                      background:
                        "linear-gradient(to top, rgba(255,191,64,0.25), rgba(255,191,64,0.45), rgba(255,191,64,0.25))",
                      borderTop: "1px solid rgba(255,191,64,0.75)",
                      borderBottom: "1px solid rgba(255,191,64,0.75)",
                    }}
                  />
                  {/* Tick marks */}
                  {[0, 25, 50, 75, 100].map((pct) => (
                    <div
                      key={pct}
                      className="absolute left-0 right-0 h-px bg-[#FFBF40]/15"
                      style={{ bottom: `${pct}%` }}
                    />
                  ))}
                  {/* Fill — Peak red (extend) → orange (almost) → yellow (goal) */}
                  <div
                    className="absolute bottom-0 left-[3px] right-[3px] rounded-b-md transition-[height] duration-100 ease-out"
                    style={{
                      height: `${Math.max(0, Math.min(100, ((kneeAngle - 90) / 90) * 100))}%`,
                      background:
                        kneeAngle >= 150 && kneeAngle <= 170
                          ? "linear-gradient(to top, #B8861F, #FFBF40, #FFD473)"
                          : kneeAngle >= 140
                            ? "linear-gradient(to top, #B8421A, #FF6021, #FF8A4D)"
                            : "linear-gradient(to top, #8A1B12, #E42E20, #F25A4D)",
                      boxShadow:
                        kneeAngle >= 150 && kneeAngle <= 170
                          ? "0 0 12px rgba(255,191,64,0.7)"
                          : "none",
                    }}
                  />
                  {/* Goal zone label */}
                  <div
                    className="absolute -right-9 text-[8px] font-black text-[#FFBF40] uppercase tracking-wider"
                    style={{
                      bottom: `${((160 - 90) / 90) * 100}%`,
                      transform: "translateY(50%)",
                      textShadow: "0 0 6px rgba(255,191,64,0.8)",
                    }}
                  >
                    GOAL
                  </div>
                </div>
              </div>

              {/* Knee Angle Panel */}
              <div className="panel-dark flex flex-col items-center gap-2 px-4 py-3 rounded-xl">
                <div className="peak-bracket text-[10px] font-black text-[#FFBF40] uppercase tracking-[0.25em]">
                  Knee Angle
                </div>
                <div
                  className="font-druk text-3xl tabular-nums"
                  style={{
                    color:
                      kneeAngle >= 150 && kneeAngle <= 170
                        ? "#FFBF40"
                        : kneeAngle >= 140
                          ? "#FF6021"
                          : "#E42E20",
                  }}
                >
                  {kneeAngle}°
                </div>
                <div
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    color:
                      kneeAngle >= 150 && kneeAngle <= 170
                        ? "#FFBF40"
                        : kneeAngle >= 140
                          ? "#FF6021"
                          : "#E42E20",
                  }}
                >
                  {kneeAngle >= 150 && kneeAngle <= 170
                    ? "GOAL ZONE!"
                    : kneeAngle >= 140
                      ? "Almost..."
                      : "Extend leg"}
                </div>
              </div>
            </div>
          )}

          {/* Game Area Spacer */}
          <div
            className="relative w-full max-w-md lg:max-w-lgit mx-auto"
            style={{
              height: "calc(100vh - 240px)",
              maxHeight: "450px",
              opacity: 1,
              transition: "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: "auto",
            }}
          >
            <AnimatePresence>
              {!showShotVideo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center z-20"
                >
                  <div className="text-center animate-bounce-gentle">
                    <div className="text-white/60 text-sm font-semibold tracking-wide">
                      Kick to shoot!
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feedback Text */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className={`fixed top-40 left-1/2 -translate-x-1/2 text-4xl font-black font-display uppercase tracking-tight z-50 ${feedback === "Miss!" ? "text-white" : feedback === "Swish!" ? "text-white" : "text-white"}`}
                style={{
                  textShadow:
                    feedback === "Miss!"
                      ? "0 0 30px rgba(255,255,255,1)"
                      : feedback === "Swish!"
                        ? "0 0 40px rgba(255,255,255,1)"
                        : "0 0 30px rgba(255,255,255,1)",
                }}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Score - Fixed Top Left */}
          <div className="fixed top-35 left-24 z-40">
            <div className="panel-dark flex flex-col items-center justify-center px-7 py-4 rounded-xl min-w-[140px]" data-testid="panel-score">
              <div className="flex items-center gap-2 mb-1">
                <PeakArrow size={12} color="#E42E20" />
                <span
                  className="peak-bracket text-[12px] text-[#FFBF40] uppercase font-black tracking-[0.3em]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Score
                </span>
                <PeakArrow size={12} color="#E42E20" className="rotate-180" />
              </div>
              <motion.div
                key={score}
                initial={score > 0 ? { scale: 1.3, color: "#FFBF40" } : {}}
                animate={{ scale: 1, color: "#FFFFFF" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="font-druk text-6xl tabular-nums leading-none"
                data-testid="text-score"
              >
                {score.toString().padStart(3, "0")}
              </motion.div>
            </div>
          </div>

          {/* Shot Clock - Fixed Top Right */}
          <div className="fixed top-35 right-24 z-40">
            <div
              className={`panel-dark flex flex-col items-center justify-center px-5 py-4 rounded-xl min-w-[140px] ${timeLeft <= 10 ? "border-[#E42E20]" : ""}`}
              style={
                timeLeft <= 10
                  ? {
                      boxShadow: "0 0 30px rgba(228,46,32,0.85)",
                      borderColor: "#E42E20",
                    }
                  : {}
              }
              data-testid="panel-shot-clock"
            >
              <div className="flex items-center gap-2 mb-1">
                <PeakArrow size={12} color="#E42E20" />
                <span
                  className="peak-bracket text-[12px] text-[#FFBF40] uppercase font-black tracking-[0.3em]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Shot Clock
                </span>
                <PeakArrow size={12} color="#E42E20" className="rotate-180" />
              </div>
              <div
                className={`font-druk text-6xl tabular-nums leading-none ${timeLeft <= 10 ? "text-[#E42E20]" : "text-white"}`}
                data-testid="text-shot-clock"
              >
                :{timeLeft.toString().padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Camera Controls - Bottom Right */}
          <div
            className="fixed bottom-15 right-8 z-40 flex flex-col items-center gap-2"
            style={{ width: "min(70vw, 200px)" }}
          >
            {!isShooting && timeLeft > 40 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-white text-[10px] tracking-wide"
              >
                {cameraEnabled
                  ? "Extend your leg to kick!"
                  : "Enabling pose detection..."}
              </motion.div>
            )}

            <motion.div
              initial={false}
              animate={{
                opacity: cameraEnabled ? 1 : 0,
                height: cameraEnabled ? "auto" : 0,
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden w-full"
            >
              <div className="w-full h-40 rounded-lg overflow-hidden relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-fit"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={poseCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-0.5 flex items-center justify-center gap-1">
                  <Activity
                    size={10}
                    className={
                      currentGesture ? "text-green-400" : "text-[#99B3E1]"
                    }
                  />
                  <span
                    className={`text-[9px] font-bold ${currentGesture ? "text-green-400" : "text-[#99B3E1]"}`}
                  >
                    {currentGesture
                      ? `${currentGesture} (${kneeAngle ?? "--"}°)`
                      : kneeAngle !== null
                        ? `Tracking (${kneeAngle}°)`
                        : "Detecting..."}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button
                  onClick={cameraEnabled ? disableCamera : enableCamera}
                  disabled={!gestureReady}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    cameraEnabled
                      ? "bg-green-500/15 text-green-400 border border-green-500/20"
                      : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/10 hover:text-white/50"
                  } ${!gestureReady ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-testid="button-toggle-camera"
                >
                  {cameraEnabled ? (
                    <Camera size={14} />
                  ) : (
                    <CameraOff size={14} />
                  )}
                  {cameraEnabled
                    ? "Gesture Control ON"
                    : gestureReady
                      ? "Reconnect Camera"
                      : "Loading..."}
                </button>
              </div>
              {gestureError && (
                <p className="text-red-400 text-xs mt-2">{gestureError}</p>
              )}
            </motion.div>
          </div>

          {/* Shoot Button - Fixed Bottom Center (manual fallback) */}
          <div className="fixed bottom-15 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => handleKickShot("goal")}
              disabled={isShooting}
              className="h-12 px-7 rounded-lg text-white font-black text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden select-none border-2 border-[#1C1C1C] shadow-[0_4px_15px_rgba(228,46,32,0.45)] transition-transform hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #E42E20 0%, #FF6021 100%)",
                fontFamily: "'Big Shoulders Display', 'Inter', sans-serif",
              }}
              data-testid="button-shoot"
            >
              <PeakArrow size={18} color="#FFFFFF" />
              <span className="relative z-10">
                {isShooting ? "Shooting..." : "Kick"}
              </span>
              <PeakArrow size={18} color="#FFFFFF" className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showTutorial && (
          <TutorialOverlay onComplete={handleTutorialComplete} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ResultsScreen = ({
  stats,
  onRestart,
}: {
  stats: GameStats;
  onRestart: () => void;
}) => {
  const rank =
    stats.score > 50
      ? "Champion"
      : stats.score > 20
        ? "Production Pro"
        : "Stagehand";
  const [showNameModal, setShowNameModal] = useState(true);
  const [playerInfo, setPlayerInfo] = useState({
    name: "",
    title: "",
    company: "",
    email: "",
  });

  const queryClient = useQueryClient();

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<Score[]>({
    queryKey: ["/api/scores", { limit: 50 }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("avx-leaderboard");
        if (cached) {
          const data = JSON.parse(cached);
          if (data.length > 0) return data;
        }
        return [];
      }
      try {
        const response = await fetch("/api/scores?limit=50");
        if (!response.ok) throw new Error("Failed to fetch scores");
        const serverData = await response.json();

        const pending = JSON.parse(
          localStorage.getItem("avx-pending-sync") || "[]",
        );
        const localUnsyncedIds = pending.map((p: any) => p.localId);
        const localScores = JSON.parse(
          localStorage.getItem("avx-leaderboard") || "[]",
        ).filter((s: any) => localUnsyncedIds.includes(s.id));

        const merged = [...serverData, ...localScores];
        merged.sort((a: any, b: any) => b.score - a.score);
        const deduped = merged.slice(0, 100);

        localStorage.setItem("avx-leaderboard", JSON.stringify(deduped));
        return deduped;
      } catch {
        const cached = localStorage.getItem("avx-leaderboard");
        if (cached) return JSON.parse(cached);
        return [];
      }
    },
    retry: false,
  });

  // Submit score mutation
  const submitScoreMutation = useMutation({
    mutationFn: async (scoreData: InsertScore) => {
      const localScore = {
        ...scoreData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };

      const addToPending = () => {
        const pending = JSON.parse(
          localStorage.getItem("avx-pending-sync") || "[]",
        );
        pending.push({
          data: scoreData,
          localId: localScore.id,
          timestamp: Date.now(),
        });
        localStorage.setItem("avx-pending-sync", JSON.stringify(pending));
      };
      const addToLocalLeaderboard = () => {
        const cached = JSON.parse(
          localStorage.getItem("avx-leaderboard") || "[]",
        );
        const exists = cached.some((s: any) => s.id === localScore.id);
        if (!exists) {
          cached.push(localScore);
          cached.sort((a: any, b: any) => b.score - a.score);
          localStorage.setItem(
            "avx-leaderboard",
            JSON.stringify(cached.slice(0, 100)),
          );
        }
      };

      if (!navigator.onLine) {
        addToPending();
        addToLocalLeaderboard();
        return localScore;
      }

      try {
        const response = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scoreData),
        });
        if (!response.ok) throw new Error("Failed to submit score");
        return response.json();
      } catch {
        addToPending();
        addToLocalLeaderboard();
        return localScore;
      }
    },
    onSuccess: () => {
      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
      }
      setShowNameModal(false);
    },
    onError: () => {
      setShowNameModal(false);
    },
  });
  const [showEmail, setShowEmail] = useState(false);
  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !playerInfo.name ||
      !playerInfo.title ||
      !playerInfo.company ||
      !playerInfo.email
    )
      return;

    submitScoreMutation.mutate({
      playerName: playerInfo.name,
      playerTitle: playerInfo.title,
      playerCompany: playerInfo.company,
      playerEmail: playerInfo.email,
      score: stats.score,
      shotsTaken: stats.shotsTaken,
      shotsMade: stats.shotsMade,
      outagesPrevented: stats.outagesPrevented,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full relative z-10 w-full max-w-6xl mx-auto p-6 overflow-y-auto"
    >
      {/* Name Entry Modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1C1C1C]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FFBF40] rounded-2xl p-8 max-w-md w-full shadow-2xl"
              style={{
                fontFamily: "Inter normal",
                border: "3px solid #1C1C1C",
              }}
            >
              <div
                className="flex items-center justify-center gap-2 text-[#1C1C1C] text-xs font-bold uppercase tracking-widest mb-3"
                style={{ fontFamily: "Video Med" }}
              >
                <PeakArrow size={14} color="#E42E20" />
                <span style={{ color: "#E42E20" }}>[</span>
                <span>Submit Your Score</span>
                <span style={{ color: "#E42E20" }}>]</span>
                <PeakArrow size={14} color="#E42E20" className="rotate-180" />
              </div>
              <h3
                className="text-3xl font-bold text-[#1C1C1C] mb-2 text-center tracking-tight"
                style={{ fontFamily: "Video Med" }}
              >
                Join the Leaderboard
              </h3>
              <p className="text-[#1C1C1C]/80 text-sm mb-6 text-center">
                Enter your details to lock in your score.
              </p>

              <form onSubmit={handleSubmitScore} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] uppercase mb-2 tracking-wider">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={playerInfo.name}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, name: e.target.value })
                    }
                    className="w-full bg-white border-2 border-[#1C1C1C] rounded-lg px-4 py-3 text-[#1C1C1C] placeholder-[#1C1C1C]/40 focus:outline-none focus:border-[#E42E20] transition-colors"
                    placeholder="Sarah Jenkins"
                    data-testid="input-player-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] uppercase mb-2 tracking-wider">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={playerInfo.title}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, title: e.target.value })
                    }
                    className="w-full bg-white border-2 border-[#1C1C1C] rounded-lg px-4 py-3 text-[#1C1C1C] placeholder-[#1C1C1C]/40 focus:outline-none focus:border-[#E42E20] transition-colors"
                    placeholder="CISO"
                    data-testid="input-player-title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] uppercase mb-2 tracking-wider">
                    Company
                  </label>
                  <input
                    type="text"
                    required
                    value={playerInfo.company}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, company: e.target.value })
                    }
                    className="w-full bg-white border-2 border-[#1C1C1C] rounded-lg px-4 py-3 text-[#1C1C1C] placeholder-[#1C1C1C]/40 focus:outline-none focus:border-[#E42E20] transition-colors"
                    placeholder="FinTech Corp"
                    data-testid="input-player-company"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-[#1C1C1C] uppercase mb-2 tracking-wider">
                    Email
                  </label>

                  <input
                    type={showEmail ? "text" : "password"}
                    required
                    autoComplete="off"
                    value={playerInfo.email}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, email: e.target.value })
                    }
                    className="w-full bg-white border-2 border-[#1C1C1C] rounded-lg px-4 py-3 pr-12 text-[#1C1C1C] placeholder-[#1C1C1C]/40 focus:outline-none focus:border-[#E42E20] transition-colors"
                    placeholder="sarah@fintechcorp.com"
                    data-testid="input-player-email"
                  />

                  {/* Eye Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className="absolute right-3 top-[38px] text-[#1C1C1C]/70 hover:text-[#E42E20] transition"
                  >
                    {showEmail ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNameModal(false)}
                    type="button"
                    className="flex-1 h-12 rounded-md text-sm font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#1C1C1C",
                      border: "3px solid #1C1C1C",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    data-testid="button-skip-score"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={submitScoreMutation.isPending}
                    className="flex-1 h-12 rounded-md text-sm font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#E42E20",
                      color: "#FFFFFF",
                      border: "3px solid #1C1C1C",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    data-testid="button-submit-score"
                  >
                    {submitScoreMutation.isPending
                      ? "Submitting..."
                      : "Submit Score"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-10 mt-4 z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div
            className="flex items-center justify-center gap-3 text-[#FFBF40] text-xl font-bold uppercase tracking-widest mb-2"
            style={{ fontFamily: "Video Med" }}
          >
            <PeakArrow size={20} color="#E42E20" />
            <span style={{ color: "#E42E20" }}>[</span>
            <span>Match Complete</span>
            <span style={{ color: "#E42E20" }}>]</span>
            <PeakArrow size={20} color="#E42E20" className="rotate-180" />
          </div>
          <h1
            className="text-5xl md:text-6xl lg:text-8xl font-bold text-[#FFBF40] mb-4 tracking-tighter"
            style={{ fontFamily: "Video Med" }}
          >
            {stats.score}{" "}
            <span className="text-3xl text-[#FFBF40] align-top">PTS</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-[#FFBF40] font-bold border-2 border-[#FFBF40]">
            <Trophy size={18} />
            {rank}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-12 max-w-2xl mx-auto w-full">
        {/* Stats Card */}
        <Card
          className="border border-white/5 bg-[#99B3E1]/5 p-8"
          style={{ fontFamily: "Inter normal" }}
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-[#E42E20]" size={20} />
            <span style={{ color: "#E42E20", fontWeight: 800, marginRight: 4 }}>[</span>
            Match Report
            <span style={{ color: "#E42E20", fontWeight: 800, marginLeft: 4 }}>]</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[#99B3E1] text-sm uppercase mb-1">
                Success Rate
              </div>
              <div
                className="text-2xl font-bold text-[#FFBF40]"
                style={{ fontFamily: "Inter normal" }}
              >
                {stats.shotsTaken > 0
                  ? Math.round((stats.shotsMade / stats.shotsTaken) * 100)
                  : 0}
                %
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[#1C1C1C] text-sm uppercase mb-1 font-bold">
                Goals Scored
              </div>
              <div
                className="text-2xl font-bold text-primary"
                style={{ fontFamily: "inter normal" }}
              >
                {stats.outagesPrevented}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button
              onClick={onRestart}
              variant="none"
              className="w-full text-[#99B3E1] border border-[#99B3E1]"
              data-testid="button-play-again"
            >
              Play Again
            </Button>
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3
            className="text-xl text-white font-bold flex items-center gap-2"
            style={{ fontFamily: " Video Med " }}
          >
            <Trophy className="text-yellow-400" size={22} />
            Leaderboard
          </h3>
        </div>

        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-[#99B3E1]">
              <Trophy className="mx-auto mb-3 opacity-50" size={50} />
              <p>Be the first to join the leaderboard!</p>
            </div>
          ) : (
            leaderboard.map((player, i) => {
              const isTop3 = i < 3;
              const medalColors = [
                {
                  bg: "from-yellow-500/20 to-yellow-900/10",
                  border: "border-yellow-500/40",
                  badge: "bg-yellow-500 text-black",
                  text: "text-yellow-300",
                  fontfamily: "Video Med",
                },
                {
                  bg: "from-[#99B3E1]/15 to-[#99B3E1]/10",
                  border: "border-[#99B3E1]/30",
                  badge: "bg-[#99B3E1] text-black",
                  text: "text-[#99B3E1]",
                  fontfamily: "Video Med",
                },
                {
                  bg: "from-[#FFBF40]/20 to-[#FFBF40]/10",
                  border: "border-[#FFBF40]/30",
                  badge: "bg-[#FFBF40] text-black",
                  text: "text-[#FFBF40]",
                  fontfamily: "Video Med",
                },
              ];
              const medal = isTop3 ? medalColors[i] : null;
              const medalEmoji =
                i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center p-4 rounded-xl border ${
                    isTop3
                      ? `bg-gradient-to-r ${medal!.bg} ${medal!.border}`
                      : "bg-white/5 border-white/5"
                  }`}
                  data-testid={`leaderboard-entry-${player.id}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 text-sm ${
                      isTop3 ? medal!.badge : "bg-white/10 text-[#99B3E1]"
                    }`}
                  >
                    {medalEmoji || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold truncate ${isTop3 ? medal!.text : "text-[#99B3E1]"}`}
                      data-testid={`text-player-name-${player.id}`}
                    >
                      {player.playerName}
                    </div>
                    <div className="text-xs text-[#99B3E1] truncate">
                      {player.playerTitle} • {player.playerCompany}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-xl ml-3 ${isTop3 ? "text-white" : "text-[#99B3E1]"}`}
                    style={{ fontFamily: "Video Med" }}
                    data-testid={`text-score-${player.id}`}
                  >
                    {player.score}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Leaderboard Screen ---

const LeaderboardScreen = ({ onBack }: { onBack: () => void }) => {
  const { data: leaderboard = [] } = useQuery<Score[]>({
    queryKey: ["/api/scores", { limit: 100 }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("avx-leaderboard");
        if (cached) {
          const data = JSON.parse(cached);
          if (data.length > 0) return data;
        }
        return [];
      }
      try {
        const res = await fetch("/api/scores?limit=100");
        if (!res.ok) throw new Error("Failed to fetch scores");
        const serverData = await res.json();

        const pending = JSON.parse(
          localStorage.getItem("avx-pending-sync") || "[]",
        );
        const localUnsyncedIds = pending.map((p: any) => p.localId);
        const localScores = JSON.parse(
          localStorage.getItem("avx-leaderboard") || "[]",
        ).filter((s: any) => localUnsyncedIds.includes(s.id));

        const merged = [...serverData, ...localScores];
        merged.sort((a: any, b: any) => b.score - a.score);
        const deduped = merged.slice(0, 100);

        localStorage.setItem("avx-leaderboard", JSON.stringify(deduped));
        return deduped;
      } catch {
        const cached = localStorage.getItem("avx-leaderboard");
        if (cached) return JSON.parse(cached);
        return [];
      }
    },
    refetchInterval: 10000,
    retry: false,
  });

  const medalColors = [
    {
      bg: "from-yellow-500/20 to-yellow-900/10",
      border: "border-yellow-500/40",
      badge: "bg-yellow-500 text-black",
      text: "text-yellow-300",
      fontfamily: "Video Med",
    },
    {
      bg: "from-[#99B3E1]/15 to-[#99B3E1]/10",
      border: "border-[#99B3E1]/30",
      badge: "bg-[#99B3E1] text-black",
      text: "text-[#99B3E1]",
      fontfamily: "Video Med",
    },
    {
      bg: "from-[#FFBF40]/20 to-[#FFBF40]/10",
      border: "border-[#FFBF40]/30",
      badge: "bg-[#FFBF40] text-black",
      text: "text-[#FFBF40]",
      fontfamily: "Video Med",
    },
  ];

  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-y-auto py-8 px-4"
      data-testid="leaderboard-screen"
    >
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 px-2">
          <h2
            className="text-2xl text-white font-bold flex items-center gap-3"
            style={{ fontFamily: "Inter normal" }}
          >
            <Trophy className="text-yellow-400" size={28} />
            Leaderboard
          </h2>
          <button
            onClick={onBack}
            className="text-base text-white hover:text-white transition-colors uppercase tracking-wider font-semibold"
            style={{ fontFamily: "Inter normal" }}
            data-testid="button-back-home"
          >
            Back
          </button>
        </div>

        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div
              className="text-center py-12 text-[#99B3E1] text-base"
              style={{ fontFamily: "Inter normal" }}
            >
              <Trophy className="mx-auto mb-3 opacity-50" size={48} />
              <p>No scores yet. Be the first to play!</p>
            </div>
          ) : (
            leaderboard.map((player, i) => {
              const isTop3 = i < 3;
              const medal = isTop3 ? medalColors[i] : null;
              const medalEmoji =
                i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center p-4 rounded-xl border ${
                    isTop3
                      ? `bg-gradient-to-r ${medal!.bg} ${medal!.border}`
                      : "bg-white/5 border-white/5"
                  }`}
                  data-testid={`leaderboard-rank-${i + 1}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 text-sm ${
                      isTop3 ? medal!.badge : "bg-white/10 text-[#99B3E1]"
                    }`}
                  >
                    {medalEmoji || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold truncate text-lg ${isTop3 ? medal!.text : "text-[#99B3E1]"}`}
                      style={{ fontFamily: "Video Med" }}
                    >
                      {player.playerName}
                    </div>
                    <div className="text-xs text-[#99B3E1] truncate">
                      {player.playerTitle} • {player.playerCompany}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-2xl ml-3 ${isTop3 ? "text-white" : "text-[#99B3E1]"}`}
                    style={{ fontFamily: "Video Med" }}
                  >
                    {player.score}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

async function syncPendingScores() {
  const pending = JSON.parse(localStorage.getItem("avx-pending-sync") || "[]");
  if (pending.length === 0) return;

  const syncedLocalIds: number[] = [];
  const remaining = [];

  for (const item of pending) {
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.data),
      });
      if (res.ok) {
        syncedLocalIds.push(item.localId);
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem("avx-pending-sync", JSON.stringify(remaining));

  if (syncedLocalIds.length > 0) {
    const cached = JSON.parse(localStorage.getItem("avx-leaderboard") || "[]");
    const cleaned = cached.filter((s: any) => !syncedLocalIds.includes(s.id));
    localStorage.setItem("avx-leaderboard", JSON.stringify(cleaned));
  }
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  React.useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      await syncPendingScores();
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return isOnline;
}

function GameApp() {
  const brand = useBrand();
  const [screen, setScreen] = useState<ScreenState>("home");
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    shotsTaken: 0,
    shotsMade: 0,
    outagesPrevented: 0,
  });
  const isOnline = useOnlineStatus();

  const handleStartGame = () => {
    initAudio();
    setStats({ score: 0, shotsTaken: 0, shotsMade: 0, outagesPrevented: 0 });
    setScreen("game");
  };

  const handleEndRound = () => {
    setScreen("results");
  };

  const updateStats = (made: boolean) => {
    setStats((prev) => ({
      ...prev,
      score: made ? prev.score + 3 : prev.score,
      shotsTaken: prev.shotsTaken + 1,
      shotsMade: made ? prev.shotsMade + 1 : prev.shotsMade,
      outagesPrevented: made
        ? prev.outagesPrevented + 1
        : prev.outagesPrevented,
    }));
  };

  return (
    <div
      className="h-screen overflow-hidden font-sans relative"
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
        backgroundColor: "#1C1C1C",
      }}
    >
      {/* Peak tech-grid background — applies to game/results/leaderboard screens */}
      {screen !== "home" && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundColor: "#1C1C1C",
            backgroundImage:
              "linear-gradient(rgba(255,191,64,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,191,64,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          data-testid="peak-grid-bg"
        />
      )}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {screen === "home" && (
          brand.bgUrl && isBgVideo(brand.bgUrl) ? (
            <video
              src={brand.bgUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <img
              src={brand.bgUrl ?? `${import.meta.env.BASE_URL}soccer/soccer.jpg`}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-screen flex flex-col">
        {/* Navigation / Header - Minimal */}
        <header
          className="px-6 flex justify-between items-center z-50 bg-white/25 backdrop-blur-xl "
          style={{ height: "40px" }}
        >
          <Logo />

          {/* <div className="flex-1 overflow-hidden " style={{ height: "48px" }}>
            <div
              className="inline-flex"
              style={{
                animation: "ribbonScroll 10s linear infinite",
                height: "48px",
              }}
              data-testid="ribbon-banner"
            >
              {[0, 1].map((i) => (
                <img
                  key={i}
                  src={`${import.meta.env.BASE_URL}ribbon-banner.png`}
                  alt=""
                  style={{ height: "48px" }}
                  className="object-cover pointer-events-none"
                />
              ))}
            </div>
          </div> */}

          <div className="flex items-center gap-4">
            {screen !== "home" && (
              <button
                onClick={() => setScreen("home")}
                className="text-sm text-white hover:text-white transition-colors uppercase tracking-widest "
                style={{ fontFamily: "Inter normal" }}
              >
                Exit
              </button>
            )}
            <div className="w-px h-4 bg-white/10 hidden md:block" />
            <div
              className="hidden md:flex items-center gap-2 text-sm font-medium text-white"
              style={{ fontFamily: "Inter normal" }}
            >
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
              />
              {isOnline ? "System Operational" : "Offline Mode"}
            </div>
          </div>
        </header>

        <div className="absolute top-[40px] left-0 right-0 z-50 pointer-events-none">
          <LeaderboardTicker />
        </div>

        <main
          className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden z-10"
          style={{ marginTop: "0px" }}
        >
          <AnimatePresence mode="wait">
            {screen === "home" && (
              <HomeScreen
                key="home"
                onStart={handleStartGame}
                onLeaderboard={() => setScreen("leaderboard")}
              />
            )}
            {screen === "game" && (
              <GameScreen
                key="game"
                onEndRound={handleEndRound}
                updateStats={updateStats}
              />
            )}
            {screen === "results" && (
              <ResultsScreen
                key="results"
                stats={stats}
                onRestart={handleStartGame}
              />
            )}
            {screen === "leaderboard" && (
              <LeaderboardScreen
                key="leaderboard"
                onBack={() => setScreen("home")}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/display" component={DisplayLeaderboard} />
        <Route component={GameApp} />
      </Switch>
    </QueryClientProvider>
  );
}
