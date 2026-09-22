import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  distance: number;
  rotation: number;
  shape: "circle" | "square" | "star";
}

interface ParticleBurstProps {
  type: "correct" | "wrong" | null;
  trigger: number; // increment to re-trigger
}

const CORRECT_COLORS = ["#22c55e", "#86efac", "#22d3ee", "#67e8f9", "#a3e635", "#4ade80"];
const WRONG_COLORS = ["#ef4444", "#fca5a5", "#f97316", "#fb923c", "#dc2626", "#ff6b6b"];

function generateParticles(type: "correct" | "wrong"): Particle[] {
  const colors = type === "correct" ? CORRECT_COLORS : WRONG_COLORS;
  return Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 50 + (Math.random() - 0.5) * 20,
    size: Math.random() * 10 + 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: (i / 28) * 360 + Math.random() * 20 - 10,
    distance: Math.random() * 180 + 80,
    rotation: Math.random() * 360,
    shape: (["circle", "square", "star"] as const)[Math.floor(Math.random() * 3)],
  }));
}

export function ParticleBurst({ type, trigger }: ParticleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!type || trigger === 0) return;
    setParticles(generateParticles(type));
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, [trigger, type]);

  if (!visible || !type) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
      <AnimatePresence>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const dx = Math.cos(rad) * p.distance;
          const dy = Math.sin(rad) * p.distance;

          return (
            <motion.div
              key={`${trigger}-${p.id}`}
              initial={{
                x: `calc(${p.x}% - ${p.size / 2}px)`,
                y: `calc(${p.y}% - ${p.size / 2}px)`,
                opacity: 1,
                scale: 0.3,
                rotate: 0,
              }}
              animate={{
                x: `calc(${p.x}% - ${p.size / 2}px + ${dx}px)`,
                y: `calc(${p.y}% - ${p.size / 2}px + ${dy}px)`,
                opacity: 0,
                scale: 1,
                rotate: p.rotation,
              }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                backgroundColor: p.shape === "star" ? "transparent" : p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "0",
                boxShadow: p.shape !== "star" ? `0 0 ${p.size}px ${p.color}80` : undefined,
              }}
            >
              {p.shape === "star" && (
                <span style={{ fontSize: p.size, color: p.color, lineHeight: 1 }}>★</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
