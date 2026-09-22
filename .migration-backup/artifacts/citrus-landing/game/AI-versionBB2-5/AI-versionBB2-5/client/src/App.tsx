import React, { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  Image as ImageIcon,
} from "lucide-react";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";

import { useBrand } from "./brand-bridge";

/** A custom landing-screen background can be an image or a video — the customizer doesn't track which, so sniff it from the data: URI mime type or file extension. */
function isBgVideo(url: string): boolean {
  return url.startsWith("data:video") || /\.(mp4|webm|mov)(\?|$)/i.test(url);
}
import type { Score, InsertScore } from "@shared/schema";
import { Route, Switch } from "wouter";
import DisplayLeaderboard from "./pages/DisplayLeaderboard";

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

// --- ParallaxCard Component ---
function ParallaxCard({ children }: { children: React.ReactNode }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const smoothX = useSpring(rotateX, { stiffness: 120, damping: 18 });
  const smoothY = useSpring(rotateY, { stiffness: 120, damping: 18 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateAmountX = ((y - centerY) / centerY) * -10;
    const rotateAmountY = ((x - centerX) / centerX) * 10;
    rotateX.set(rotateAmountX);
    rotateY.set(rotateAmountY);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: smoothX,
        rotateY: smoothY,
        transformStyle: "preserve-3d",
      }}
      className="group"
    >
      {children}
    </motion.div>
  );
}

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
  style,
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
  style?: React.CSSProperties;
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
      style={style}
    >
      {children}
    </motion.button>
  );
}

function Logo() {
  const brand = useBrand();
  return (
    <div className="flex items-center gap-2">
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
      <span
        className="font-semibold tracking-wide lg:mr-8 mr-4"
        style={{ fontSize: brand.brandNameSize, color: brand.brandNameColor, fontFamily: "var(--brand-font, inherit)" }}
      >
        {brand.brandName}
      </span>
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
      className="w-full bg-black/40 border border-white/[0.06] overflow-hidden relative z-40"
      data-testid="leaderboard-ticker"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />
      <div className="flex items-center h-14">
        <div className="shrink-0 h-full flex items-center gap-2 px-6 z-10 border-r border-white/[0.06]">
          <Trophy size={28} className="text-amber-400/80" />
          <span className="text-xl font-semibold uppercase tracking-[0.15em] text-white/50">
            Live
          </span>
        </div>
        <div className="overflow-hidden flex-1 relative rounded-full">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/40 to-transparent z-10 pointer-events-none " />
          <div
            className="flex items-center gap-7 whitespace-nowrap py-2 px-8"
            style={{
              animation: `ticker ${Math.max(leaderboard.length * 4, 20)}s linear infinite`,
              willChange: "transform",
              transform: "translateZ(0)",
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
                    className={`text-3xl ${isTop3 ? "text-amber-400/70" : "text-white/20"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
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
                    className={`font-bold text-3xl ${isTop3 ? "text-amber-300/90" : "text-white/30"}`}
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
      className="flex flex-col min-h-full relative z-10 p-10 mt-10 md:p-8 lg:pt-4 max-w-7xl mx-auto w-full overflow-y-auto"
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col w-full items-center justify-center gap-4"
        >
          <span
            className="uppercase tracking-[0.2em] font-semibold mb-2"
            style={{ fontSize: brand.headingSize, color: brand.headingColor, fontFamily: "var(--brand-font, inherit)" }}
          >
            {brand.heading}
          </span>
          <Button
            onClick={onStart}
            variant="none"
            className="h-14 w-70 flex items-center justify-center bg-black border text-white !text-2xl tracking-widest transition-all duration-300 hover:scale-105 active:scale-90"
            style={{ borderColor: brand.primaryColor, boxShadow: `0 0 24px -6px ${brand.primaryColor}` }}
            data-testid="button-play"
          >
            Play
          </Button>

          <Button
            onClick={onLeaderboard}
            variant="none"
            className="h-14 w-70 flex items-center justify-center text-white border border-white !text-2xl tracking-widest transition-all duration-300 hover:scale-105 active:scale-90"
            data-testid="button-leaderboard"
          >
            Leaderboard
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

const TUTORIAL_STEPS = [
  { image: `${import.meta.env.BASE_URL}newbb/step1.jpeg` },
  { image: `${import.meta.env.BASE_URL}ball/step2.jpg` },
  { image: `${import.meta.env.BASE_URL}ball/step3.jpg` },
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
          className="bg-slate-900 border border-white/10 rounded-2xl p-3 shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          style={{ maxHeight: "90vh" }}
        >
          <div className="mb-3 rounded-lg overflow-hidden border border-white/10 flex-1 min-h-0">
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
                className={`flex-1 h-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-white/10"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between shrink-0">
            <button
              onClick={handleSkip}
              className="text-xs text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider font-semibold"
              data-testid="button-skip-tutorial"
            >
              Skip
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg text-white font-bold text-sm border border-white/10"
              style={{
                background: "linear-gradient(135deg, #FF3627 0%, #4B00FF 100%)",
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

const PERFECT_VIDEO = `${import.meta.env.BASE_URL}newbb/hit2.mp4`;
const HIT_VIDEO = `${import.meta.env.BASE_URL}newbb/hit3.mp4`;
const MISS_VIDEO = `${import.meta.env.BASE_URL}newbb/miss.mp4`;

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
  const resolveVideo = usePreloadedVideos([
    PERFECT_VIDEO,
    HIT_VIDEO,
    MISS_VIDEO,
  ]);
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
  const [clockPaused, setClockPaused] = useState(false);
  const isPerfectShotRef = React.useRef(false);
  const netVariants = {
    idle: { scaleY: 1 },
    score: { scaleY: [1, 1.25, 0.95, 1] },
  };
  const [shotResult, setShotResult] = useState<"score" | "miss" | null>(null);

  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  const chargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeDirectionRef = useRef(1);

  const powerBarRef = useRef<HTMLDivElement>(null);
  const powerIndicatorRef = useRef<HTMLDivElement>(null);
  const powerTextRef = useRef<HTMLDivElement>(null);

  const startCharging = useCallback(() => {
    if (shootingRef.current || chargingRef.current) return;
    chargingRef.current = true;
    setIsCharging(true);
    powerRef.current = 0;
    chargeDirectionRef.current = 1;
    setPower(0);

    const updatePowerBarDOM = (p: number) => {
      if (powerBarRef.current) {
        powerBarRef.current.style.height = `${p}%`;
        const color =
          p < 30
            ? "linear-gradient(to top, #1D4ED8, #3B82F6, #60A5FA)"
            : p < 60
              ? "linear-gradient(to top, #B45309, #F59E0B, #FCD34D)"
              : p < 85
                ? "linear-gradient(to top, #15803D, #22C55E, #86EFAC)"
                : "linear-gradient(to top, #B91C1C, #EF4444, #FCA5A5)";
        powerBarRef.current.style.background = color;
        const shadowColor =
          p < 30
            ? "rgba(59,130,246,0.6)"
            : p < 60
              ? "rgba(245,158,11,0.6)"
              : p < 85
                ? "rgba(34,197,94,0.6)"
                : "rgba(239,68,68,0.6)";
        powerBarRef.current.style.boxShadow =
          p > 5
            ? `0 0 12px ${shadowColor}, inset 0 0 8px rgba(255,255,255,0.15)`
            : "none";
      }
      if (powerIndicatorRef.current) {
        powerIndicatorRef.current.style.bottom = `calc(${p}% - 2px)`;
        powerIndicatorRef.current.style.display = p > 5 ? "block" : "none";
        const glowColor =
          p < 30
            ? "rgba(59,130,246,0.8)"
            : p < 60
              ? "rgba(245,158,11,0.8)"
              : p < 85
                ? "rgba(34,197,94,0.8)"
                : "rgba(239,68,68,0.8)";
        powerIndicatorRef.current.style.boxShadow = `0 0 6px rgba(255,255,255,0.8), 0 0 15px ${glowColor}`;
      }
      if (powerTextRef.current) {
        powerTextRef.current.textContent = `${Math.round(p)}%`;
        const textColor =
          p < 30
            ? "#60A5FA"
            : p < 60
              ? "#FCD34D"
              : p < 85
                ? "#86EFAC"
                : "#FCA5A5";
        powerTextRef.current.style.color = textColor;
        const textShadowColor =
          p < 30
            ? "rgba(59,130,246,0.6)"
            : p < 60
              ? "rgba(245,158,11,0.6)"
              : p < 85
                ? "rgba(34,197,94,0.6)"
                : "rgba(239,68,68,0.6)";
        powerTextRef.current.style.textShadow =
          p > 0 ? `0 0 10px ${textShadowColor}` : "none";
      }
    };

    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
      navigator.userAgent,
    );
    const chargeSpeed = isMobileDevice ? 5 : 3;
    const chargeInterval = isMobileDevice ? 50 : 25;
    chargeIntervalRef.current = setInterval(() => {
      powerRef.current += chargeDirectionRef.current * chargeSpeed;
      if (powerRef.current >= 100) {
        powerRef.current = 100;
        chargeDirectionRef.current = -1;
      } else if (powerRef.current <= 0) {
        powerRef.current = 0;
        chargeDirectionRef.current = 1;
      }
      updatePowerBarDOM(powerRef.current);
    }, chargeInterval);
  }, []);

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
          setClockPaused(false);
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

  const playVideo = useCallback(
    (srcVideoRef: React.RefObject<HTMLVideoElement | null>) => {
      const video = srcVideoRef.current;
      if (!video || !shotVideoRef.current) return;

      shotVideoRef.current.src = video.src;
      shotVideoRef.current.currentTime = 0;
      shotVideoRef.current.playbackRate = 1;
      shotVideoRef.current.muted = getIsMuted();
      shotVideoRef.current.play().catch(() => {
        handleShotVideoEnded();
      });
      startVideoTimeout();
    },
    [handleShotVideoEnded, startVideoTimeout],
  );

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

  const releaseShoot = useCallback(() => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    setIsCharging(false);
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    const currentPower = powerRef.current;
    if (currentPower < 5) {
      setPower(0);
      powerRef.current = 0;
      if (powerBarRef.current) {
        powerBarRef.current.style.height = "0%";
        powerBarRef.current.style.boxShadow = "none";
      }
      if (powerIndicatorRef.current) {
        powerIndicatorRef.current.style.display = "none";
      }
      if (powerTextRef.current) {
        powerTextRef.current.textContent = "0%";
        powerTextRef.current.style.color = "#60A5FA";
        powerTextRef.current.style.textShadow = "none";
      }
      return;
    }
    if (shootingRef.current) return;
    shootingRef.current = true;

    const sweetSpot = Math.abs(currentPower - 75);
    const isPerfect = sweetSpot <= 2;
    const successChance = isPerfect
      ? 1
      : sweetSpot < 10
        ? 0.75
        : sweetSpot < 25
          ? 0.5
          : sweetSpot < 45
            ? 0
            : 0;
    const isSuccess = Math.random() < successChance;
    setShotResult(isSuccess ? "score" : "miss");
    shotResultRef.current = isSuccess ? "score" : "miss";
    isPerfectShotRef.current = isPerfect && isSuccess;
    setIsShooting(true);
    setShowShotVideo(true);
    playSwoosh();

    if (isPerfect && isSuccess) {
      setClockPaused(true);
    }

    if (isPerfect && isSuccess) {
      playShotVideo(PERFECT_VIDEO);
    } else if (isSuccess) {
      playShotVideo(HIT_VIDEO);
    } else {
      playShotVideo(MISS_VIDEO);
    }

    setPower(0);
    powerRef.current = 0;
    if (powerBarRef.current) {
      powerBarRef.current.style.height = "0%";
      powerBarRef.current.style.boxShadow = "none";
    }
    if (powerIndicatorRef.current) {
      powerIndicatorRef.current.style.display = "none";
    }
    if (powerTextRef.current) {
      powerTextRef.current.textContent = "0%";
      powerTextRef.current.style.color = "#60A5FA";
      powerTextRef.current.style.textShadow = "none";
    }
  }, [updateStats, handleShotVideoEnded, playVideo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        startCharging();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        releaseShoot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    };
  }, [startCharging, releaseShoot]);

  const handleShoot = useCallback(() => {
    if (shootingRef.current) return;
    shootingRef.current = true;

    const isSuccess = Math.random() > 0.65;
    setShotResult(isSuccess ? "score" : "miss");
    shotResultRef.current = isSuccess ? "score" : "miss";
    isPerfectShotRef.current = false;
    setIsShooting(true);
    setShowShotVideo(true);
    playSwoosh();

    if (isSuccess) {
      playShotVideo(HIT_VIDEO);
    } else {
      playShotVideo(MISS_VIDEO);
    }
  }, [updateStats, handleShotVideoEnded, playVideo, playShotVideo]);

  const gestureCallbacks = React.useMemo(
    () => ({
      onGestureStart: () => {
        if (!chargingRef.current && !shootingRef.current) {
          startCharging();
        }
      },
      onGestureEnd: () => {
        if (chargingRef.current) {
          releaseShoot();
        }
      },
    }),
    [startCharging, releaseShoot],
  );

  const {
    isReady: gestureReady,
    isEnabled: cameraEnabled,
    currentGesture,
    videoRef,
    enableCamera,
    disableCamera,
    error: gestureError,
  } = useGestureRecognizer(gestureCallbacks);

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
    if (showTutorial || clockPaused) return;
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
  }, [showTutorial, clockPaused]);

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
          src={`${import.meta.env.BASE_URL}newbb/position.mp4`}
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
          {/* Power Meter - Left Side */}
          <div
            className="fixed left-14 md:left-11 lg:left-15 bottom-1/6 flex flex-col items-start z-40"
            data-testid="power-meter"
          >
            <div
              className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-2"
              style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
            >
              POWER
            </div>
            <div className=" relative w-8 h-52 rounded-lg overflow-visible">
              <div
                className="absolute inset-0 rounded-lg bg-black/60 border border-white/10"
                style={{
                  boxShadow:
                    "inset 0 2px 8px rgba(0,0,0,0.6), 0 0 15px rgba(0,0,0,0.4)",
                }}
              />

              {[0, 25, 50, 75, 100].map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ bottom: `${tick}%` }}
                >
                  <div className="w-full h-px bg-white/15" />
                </div>
              ))}

              <div
                ref={powerBarRef}
                className="absolute bottom-0 left-[3px] right-[3px] rounded-b-md"
                style={{
                  height: `${power}%`,
                  background:
                    power < 30
                      ? "linear-gradient(to top, #1D4ED8, #3B82F6, #60A5FA)"
                      : power < 60
                        ? "linear-gradient(to top, #B45309, #F59E0B, #FCD34D)"
                        : power < 85
                          ? "linear-gradient(to top, #15803D, #22C55E, #86EFAC)"
                          : "linear-gradient(to top, #B91C1C, #EF4444, #FCA5A5)",
                  boxShadow:
                    power > 5
                      ? `0 0 12px ${power < 30 ? "rgba(59,130,246,0.6)" : power < 60 ? "rgba(245,158,11,0.6)" : power < 85 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"}, inset 0 0 8px rgba(255,255,255,0.15)`
                      : "none",
                }}
              />

              <div
                className="absolute left-0 right-0 flex items-center z-10"
                style={{ bottom: "calc(75% - 1px)" }}
              >
                <div
                  className="absolute -left-2 w-[calc(100%+16px)] h-[3px] rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #22C55E, #4ADE80, #22C55E, transparent)",
                    boxShadow:
                      "0 0 8px rgba(34,197,94,0.8), 0 0 20px rgba(34,197,94,0.3)",
                  }}
                />
                <div
                  className="absolute -right-7 text-[9px] font-black text-green-400"
                  style={{ textShadow: "0 0 6px rgba(34,197,94,0.8)" }}
                >
                  BEST
                </div>
              </div>

              <div
                ref={powerIndicatorRef}
                className="absolute left-0 right-0 h-1 z-20 rounded-full"
                style={{
                  bottom: `calc(${power}% - 2px)`,
                  background: "rgba(255,255,255,0.9)",
                  display: isCharging && power > 5 ? "block" : "none",
                  boxShadow: `0 0 6px rgba(255,255,255,0.8), 0 0 15px ${power < 30 ? "rgba(59,130,246,0.8)" : power < 60 ? "rgba(245,158,11,0.8)" : power < 85 ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)"}`,
                }}
              />
            </div>

            <div
              ref={powerTextRef}
              className="mt-2 text-sm font-black tabular-nums font-display"
              style={{
                color:
                  power < 30
                    ? "#60A5FA"
                    : power < 60
                      ? "#FCD34D"
                      : power < 85
                        ? "#86EFAC"
                        : "#FCA5A5",
                textShadow:
                  power > 0
                    ? `0 0 10px ${power < 30 ? "rgba(59,130,246,0.6)" : power < 60 ? "rgba(245,158,11,0.6)" : power < 85 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"}`
                    : "none",
              }}
            >
              {power}%
            </div>
            <div className="flex flex-col items-start mt-1 gap-0.5">
              <div className="text-[10px] font-bold text-white uppercase tracking-wider">
                Hold
              </div>
              <div
                className="px-2 py-0.5 rounded bg-black/70 border border-white text-[9px] font-bold text-white tracking-wider"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
              >
                SPACE
              </div>
            </div>
          </div>

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
                      {isCharging ? "Release to shoot!" : "Charge your shot"}
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
            <div className="flex flex-col items-center justify-center px-7 py-4 rounded-xl bg-slate-900/90 backdrop-blur-sm border  min-w-[130px]">
              <div className="text-[15px] text-white uppercase font-semibold tracking-wider">
                Score
              </div>
              <motion.div
                key={score}
                initial={score > 0 ? { scale: 1.3, color: "#4ADE80" } : {}}
                animate={{ scale: 1, color: "#FFFFFF" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-5xl font-display text-white tabular-nums"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {score.toString().padStart(3, "0")}
              </motion.div>
            </div>
          </div>

          {/* Shot Clock - Fixed Top Right */}
          <div className="fixed top-35 right-24 z-40">
            <div
              className={`flex flex-col items-center justify-center px-5 py-4 rounded-xl bg-slate-900/90 backdrop-blur-sm min-w-[130px] border ${timeLeft <= 10 ? "border-red-500" : ""}`}
              style={
                timeLeft <= 10
                  ? { boxShadow: "0 0 30px rgba(239,68,68,1)" }
                  : {}
              }
            >
              <div className="text-[15px] text-white uppercase font-bold tracking-wider">
                Shot Clock
              </div>
              <div
                className={`text-5xl font-semibold tabular-nums ${timeLeft <= 10 ? "text-red-500" : "text-white"}`}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
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
                  ? "Make a fist to charge \u2022 Open hand to release!"
                  : "Enabling gesture control..."}
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
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-0.5 flex items-center justify-center gap-1">
                  <Hand
                    size={10}
                    className={
                      currentGesture ? "text-green-400" : "text-slate-500"
                    }
                  />
                  <span
                    className={`text-[9px] font-bold ${currentGesture ? "text-green-400" : "text-slate-500"}`}
                  >
                    {currentGesture || "Detecting..."}
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

          {/* Shoot Button - Fixed Bottom Center */}
          <div className="fixed bottom-15 left-1/2 -translate-x-1/2 z-40">
            <button
              onMouseDown={startCharging}
              onMouseUp={releaseShoot}
              onMouseLeave={() => {
                if (chargingRef.current) releaseShoot();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                startCharging();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                releaseShoot();
              }}
              onTouchCancel={() => {
                if (chargingRef.current) releaseShoot();
              }}
              disabled={isShooting}
              className={`w-43 h-11 rounded-lg text-white font-bold text-lg flex items-center justify-center gap-2 backdrop-blur-xs disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden select-none border border-white`}
              data-testid="button-shoot"
            >
              {isCharging && (
                <motion.div
                  className="absolute inset-0 origin-left"
                  style={{
                    scaleX: power / 100,
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.25))",
                  }}
                  transition={{ duration: 0 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Shield className="w-5 h-5" />
                {isShooting
                  ? "Shooting..."
                  : isCharging
                    ? `Power: ${power}%`
                    : "Shoot"}
              </span>
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
      ? "Crypto-Agility Champion"
      : stats.score > 20
        ? "Automation All-Star"
        : "PKI Rookie";
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

    // Also send it to the shared player_submissions table (citrus-landing's
    // api-server) so it's a real lead an operator can see across every
    // game, not just this game's own /api/scores leaderboard. `orderId` is
    // only present when this build was opened through a finalized live
    // link (see citrus-landing's customize.tsx) — absent on a raw/dev
    // preview, which is fine, the row just isn't tied to a specific brand
    // order.
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    fetch("/api/player-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: "basketball-shootout",
        orderId,
        name: playerInfo.name,
        email: playerInfo.email,
        extra: {
          title: playerInfo.title,
          company: playerInfo.company,
          score: stats.score,
          shotsTaken: stats.shotsTaken,
          shotsMade: stats.shotsMade,
          outagesPrevented: stats.outagesPrevented,
        },
      }),
    }).catch(() => {
      /* best-effort — the mutation above already handles its own local fallback */
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
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0B1120] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-2">
                Submit Your Score!
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Enter your details to join the leaderboard
              </p>

              <form onSubmit={handleSubmitScore} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={playerInfo.name}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, name: e.target.value })
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="Sarah Jenkins"
                    data-testid="input-player-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={playerInfo.title}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, title: e.target.value })
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="CISO"
                    data-testid="input-player-title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    required
                    value={playerInfo.company}
                    onChange={(e) =>
                      setPlayerInfo({ ...playerInfo, company: e.target.value })
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="FinTech Corp"
                    data-testid="input-player-company"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
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
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="sarah@fintechcorp.com"
                    data-testid="input-player-email"
                  />

                  {/* Eye Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className="absolute right-3 top-[38px] text-slate-400 hover:text-white transition"
                  >
                    {showEmail ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowNameModal(false)}
                    type="button"
                    variant="outline"
                    className="flex-1"
                  >
                    Skip
                  </Button>
                  <Button
                    type="submit"
                    variant="brand-gradient"
                    className="flex-1"
                    disabled={submitScoreMutation.isPending}
                  >
                    {submitScoreMutation.isPending
                      ? "Submitting..."
                      : "Submit Score"}
                  </Button>
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
          <div className="text-slate-300 text-base font-bold uppercase tracking-widest mb-2">
            Simulation Complete
          </div>
          <h1
            className="text-5xl md:text-6xl lg:text-8xl font-bold text-white mb-4 tracking-tighter"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {stats.score}{" "}
            <span className="text-3xl text-slate-300 align-top">PTS</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-white font-bold border-2 border-white">
            <Trophy size={18} />
            {rank}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-12 max-w-2xl mx-auto w-full">
        {/* Stats Card */}
        <Card className="border border-white/5 bg-slate-900/50">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-primary" size={20} /> Impact Report
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">
                Success Rate
              </div>
              <div
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {stats.shotsTaken > 0
                  ? Math.round((stats.shotsMade / stats.shotsTaken) * 100)
                  : 0}
                %
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">
                Outages Prevented
              </div>
              <div
                className="text-2xl font-bold text-primary"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {stats.outagesPrevented}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button
              onClick={onRestart}
              variant="secondary"
              className="w-full"
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
          <h3 className="text-xl text-white font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" size={22} />
            Leaderboard
          </h3>
        </div>

        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Trophy className="mx-auto mb-3 opacity-50" size={48} />
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
                },
                {
                  bg: "from-slate-300/15 to-slate-500/10",
                  border: "border-slate-400/30",
                  badge: "bg-slate-300 text-black",
                  text: "text-slate-200",
                },
                {
                  bg: "from-amber-700/20 to-amber-900/10",
                  border: "border-amber-600/30",
                  badge: "bg-amber-600 text-black",
                  text: "text-amber-400",
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
                      isTop3 ? medal!.badge : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {medalEmoji || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold truncate ${isTop3 ? medal!.text : "text-slate-300"}`}
                      data-testid={`text-player-name-${player.id}`}
                    >
                      {player.playerName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {player.playerTitle} • {player.playerCompany}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-xl ml-3 ${isTop3 ? "text-white" : "text-slate-300"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
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
    },
    {
      bg: "from-slate-300/15 to-slate-500/10",
      border: "border-slate-400/30",
      badge: "bg-slate-300 text-black",
      text: "text-slate-200",
    },
    {
      bg: "from-amber-700/20 to-amber-900/10",
      border: "border-amber-600/30",
      badge: "bg-amber-600 text-black",
      text: "text-amber-400",
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
          <h2 className="text-2xl text-white font-bold flex items-center gap-3">
            <Trophy className="text-yellow-400" size={28} />
            Leaderboard
          </h2>
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-white transition-colors uppercase tracking-wider font-semibold"
            data-testid="button-back-home"
          >
            Back
          </button>
        </div>

        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
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
                      isTop3 ? medal!.badge : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {medalEmoji || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold truncate text-lg ${isTop3 ? medal!.text : "text-slate-300"}`}
                    >
                      {player.playerName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {player.playerTitle} • {player.playerCompany}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-2xl ml-3 ${isTop3 ? "text-white" : "text-slate-300"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
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
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {screen === "home" && (
          brand.bgUrl && !isBgVideo(brand.bgUrl) ? (
            <img
              src={brand.bgUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              src={
                brand.bgUrl && isBgVideo(brand.bgUrl)
                  ? brand.bgUrl
                  : `${import.meta.env.BASE_URL}newbb/home.mp4`
              }
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-screen flex flex-col">
        {/* Navigation / Header - Minimal */}
        <header
          className="px-6 flex justify-between items-center z-50 border-b border-[rgba(75,0,255,0.2)] bg-black"
          style={{ height: "48px" }}
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
                  src="/ribbon-banner.png"
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
                className="text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-widest font-semibold"
              >
                Exit
              </button>
            )}
            <div className="w-px h-4 bg-white/10 hidden md:block" />
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
              />
              {isOnline ? "System Operational" : "Offline Mode"}
            </div>
          </div>
        </header>

        <LeaderboardTicker />

        {/* <div className="relative w-full overflow-hidden  shrink-0" style={{ height: "80px" }}>
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)",
            }}
          />
          <div
            className="inline-flex whitespace-nowrap h-full items-center"
            style={{ animation: "ribbonScroll 10s linear infinite" }}
            data-testid="ribbon-banner"
          >
            {[0,1].map((i) => (
              <img
                key={i}
                src="/ribbon-banner.png"
                alt=""
                className="h-full object-cover pointer-events-none"
              />
            ))}
          </div> */}
        {/* <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: "12px",
              background: "radial-gradient(ellipse 120% 100% at 50% 0%, rgba(0,0,0,0.7) 0%, transparent 100%)",
              borderRadius: "0 0 50% 50% / 0 0 100% 100%",
            }}
          /> */}
        {/* </div> */}

        <main
          className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden"
          style={{ marginTop: "-12px" }}
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
