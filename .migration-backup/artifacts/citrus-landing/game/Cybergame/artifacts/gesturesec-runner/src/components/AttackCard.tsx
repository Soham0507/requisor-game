import { motion } from "framer-motion";
import { CyberAttack } from "../data/attacks";

interface AttackCardProps {
  attack: CyberAttack;
  isVisible: boolean;
}

export function AttackCard({ attack, isVisible }: AttackCardProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: -30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: -30 }}
      className="flex flex-col items-center gap-3"
    >
      {/* Warning icon */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))",
          border: "2px solid rgba(239, 68, 68, 0.8)",
          boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
        }}
      >
        {attack.icon}
      </motion.div>

      {/* Attack name */}
      <div className="text-center">
        <p className="text-red-400 text-xs uppercase tracking-widest font-semibold">
          Cyber Attack Detected
        </p>
        <h2 className="text-white text-xl font-bold mt-1">{attack.name}</h2>
      </div>

      {/* Indicator */}
      <div
        className="px-4 py-2 rounded-lg text-sm text-center font-mono"
        style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5",
          maxWidth: 300,
        }}
      >
        ⚠ {attack.indicator}
      </div>
    </motion.div>
  );
}
