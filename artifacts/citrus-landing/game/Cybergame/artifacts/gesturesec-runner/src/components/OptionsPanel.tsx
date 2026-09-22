import { motion } from "framer-motion";

interface OptionsPanelProps {
  options: string[]; // shuffled options (4 items)
  correctOption: number; // 1-indexed correct position
  selectedOption: number | null;
  lockedOption: number | null;
  onSelect: (option: number) => void;
  result: "correct" | "wrong" | null;
}

export function OptionsPanel({
  options,
  correctOption,
  selectedOption,
  lockedOption,
  onSelect,
  result,
}: OptionsPanelProps) {
  const getOptionState = (n: number) => {
    if (lockedOption !== null) {
      if (n === correctOption) return "correct";
      if (n === lockedOption && lockedOption !== correctOption) return "wrong";
      return "neutral";
    }
    if (selectedOption === n) return "selected";
    return "idle";
  };

  const stateStyles: Record<string, React.CSSProperties> = {
    idle: {
      background: "rgba(17, 24, 39, 0.8)",
      border: "1px solid rgba(75, 85, 99, 0.6)",
      color: "#d1d5db",
    },
    selected: {
      background: "rgba(6, 78, 199, 0.3)",
      border: "2px solid #3b82f6",
      color: "#93c5fd",
      boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
    },
    correct: {
      background: "rgba(21, 128, 61, 0.3)",
      border: "2px solid #22c55e",
      color: "#86efac",
      boxShadow: "0 0 20px rgba(34, 197, 94, 0.4)",
    },
    wrong: {
      background: "rgba(153, 27, 27, 0.3)",
      border: "2px solid #ef4444",
      color: "#fca5a5",
      boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
    },
    neutral: {
      background: "rgba(17, 24, 39, 0.4)",
      border: "1px solid rgba(75, 85, 99, 0.3)",
      color: "#6b7280",
    },
  };

  const fingerIcons = ["☝", "✌", "🤟", "🖖"];

  return (
    <div className="w-full max-w-sm">
      <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-3 font-semibold">
        Choose your defense — show fingers (1–4)
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, idx) => {
          const n = idx + 1;
          const state = getOptionState(n);

          return (
            <motion.button
              key={`${n}-${option}`}
              onClick={() => onSelect(n)}
              whileHover={{ scale: lockedOption === null ? 1.03 : 1 }}
              whileTap={{ scale: lockedOption === null ? 0.97 : 1 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              disabled={lockedOption !== null}
              className="relative flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all"
              style={stateStyles[state]}
            >
              {/* Number badge */}
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm"
                style={{
                  background:
                    state === "correct"
                      ? "rgba(34, 197, 94, 0.3)"
                      : state === "wrong"
                      ? "rgba(239, 68, 68, 0.3)"
                      : state === "selected"
                      ? "rgba(59, 130, 246, 0.3)"
                      : "rgba(75, 85, 99, 0.4)",
                  border:
                    state === "correct"
                      ? "1px solid #22c55e"
                      : state === "wrong"
                      ? "1px solid #ef4444"
                      : state === "selected"
                      ? "1px solid #3b82f6"
                      : "1px solid rgba(75, 85, 99, 0.5)",
                }}
              >
                {state === "correct" ? "✓" : state === "wrong" ? "✗" : n}
              </div>

              {/* Option text */}
              <span className="text-sm font-medium leading-tight">{option}</span>

              {/* Finger icon hint */}
              <span className="absolute top-1 right-2 text-xs opacity-40">
                {fingerIcons[idx]}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
