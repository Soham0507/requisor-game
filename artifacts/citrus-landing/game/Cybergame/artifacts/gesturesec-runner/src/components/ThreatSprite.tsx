import { motion } from "framer-motion";

interface ThreatSpriteProps {
  attackId: string;
  speed: number;
  onComplete?: () => void;
}

const SPRITE_MAP: Record<string, { icon: string; color: string; secondaryIcon?: string }> = {
  "phishing":           { icon: "🎣", color: "#f59e0b", secondaryIcon: "📧" },
  "malware":            { icon: "🦠", color: "#ef4444", secondaryIcon: "💻" },
  "sql-injection":      { icon: "💉", color: "#8b5cf6", secondaryIcon: "🗄️" },
  "brute-force":        { icon: "🔨", color: "#f97316", secondaryIcon: "🔐" },
  "data-exfiltration":  { icon: "📤", color: "#ec4899", secondaryIcon: "📦" },
  "mitm":               { icon: "🕵️", color: "#06b6d4", secondaryIcon: "🔗" },
  "zero-day":           { icon: "💣", color: "#ef4444", secondaryIcon: "⚡" },
  "dns-spoofing":       { icon: "🌐", color: "#10b981", secondaryIcon: "🔀" },
  "reverse-shell":      { icon: "🔩", color: "#6366f1", secondaryIcon: "🖥️" },
  "privilege-escalation": { icon: "👑", color: "#f59e0b", secondaryIcon: "⬆️" },
};

export function ThreatSprite({ attackId, speed, onComplete }: ThreatSpriteProps) {
  const sprite = SPRITE_MAP[attackId] ?? { icon: "⚡", color: "#ef4444" };
  const duration = Math.max(0.5, 1.8 / speed);

  return (
    <motion.div
      className="absolute top-4 flex items-center gap-1"
      initial={{ x: "120%", opacity: 0 }}
      animate={{ x: "-20%", opacity: [0, 1, 1, 0.8] }}
      transition={{ duration, ease: "easeIn" }}
      onAnimationComplete={onComplete}
      style={{ right: 0 }}
    >
      {/* Trail effect */}
      {[3, 2, 1].map((i) => (
        <motion.div
          key={i}
          className="rounded-lg flex items-center justify-center"
          style={{
            width: 32 - i * 6,
            height: 32 - i * 6,
            background: `${sprite.color}${Math.round((0.12 / i) * 255).toString(16).padStart(2, "0")}`,
            border: `1px solid ${sprite.color}30`,
            fontSize: 14 - i * 3,
            marginRight: -8,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
        >
          {sprite.secondaryIcon ?? sprite.icon}
        </motion.div>
      ))}

      {/* Main sprite */}
      <motion.div
        className="flex items-center justify-center rounded-xl"
        animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 0.35, repeat: Infinity }}
        style={{
          width: 52,
          height: 52,
          background: `linear-gradient(135deg, ${sprite.color}30, ${sprite.color}10)`,
          border: `2px solid ${sprite.color}`,
          boxShadow: `0 0 20px ${sprite.color}60, 0 0 40px ${sprite.color}30`,
          fontSize: 26,
        }}
      >
        {sprite.icon}
      </motion.div>

      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{ opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{
          background: `radial-gradient(circle, ${sprite.color}40 0%, transparent 70%)`,
          filter: `blur(8px)`,
        }}
      />
    </motion.div>
  );
}
