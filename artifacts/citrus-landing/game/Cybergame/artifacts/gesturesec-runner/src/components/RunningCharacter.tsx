import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface RunningCharacterProps {
  isRunning: boolean;
  speed: number;
}

// CSS transform-origin — even with `transformBox: "view-box"` — resolves
// against the SVG viewport's coordinate frame, so on any element nested
// inside an ancestor that is itself transformed (like the bobbing/leaning
// body group), the pivot lands slightly off wherever the ancestor has moved
// the geometry. That drift is what kept detaching limbs at their joints.
// Only safe for direct children of the untransformed <svg> root.
function pivot(x: number, y: number): CSSProperties {
  return { transformBox: "view-box", transformOrigin: `${x}px ${y}px` } as CSSProperties;
}

/**
 * Rotating joint built on native SVG SMIL (`<animateTransform>`), where the
 * pivot is baked into every rotation value (`rotate(angle cx cy)`) and
 * evaluated in the element's LOCAL coordinate system — completely immune to
 * ancestor transforms, unlike CSS transform-origin. While `keys` is set the
 * animation loops through them; otherwise the group holds the static `idle`
 * rotation.
 */
function SwingGroup({
  cx,
  cy,
  keys,
  idle,
  dur,
  children,
}: {
  cx: number;
  cy: number;
  keys: number[] | null;
  idle: number;
  dur: number;
  children: ReactNode;
}) {
  return (
    <g transform={`rotate(${idle} ${cx} ${cy})`}>
      {keys && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={keys.map((a) => `${a} ${cx} ${cy}`).join(";")}
          keyTimes="0;0.5;1"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          dur={`${dur}s`}
          repeatCount="indefinite"
        />
      )}
      {children}
    </g>
  );
}

const L_SHOULDER = { x: 33, y: 42 };
const R_SHOULDER = { x: 67, y: 42 };
const L_HIP = { x: 43, y: 78 };
const R_HIP = { x: 57, y: 78 };

export function RunningCharacter({ isRunning, speed }: RunningCharacterProps) {
  const cycle = Math.max(0.55, 1.05 - (speed - 1) * 0.1);
  const intensity = Math.min(1.5, 1 + (speed - 1) * 0.18);
  const lean = isRunning ? Math.min(6, 2 + (speed - 1) * 0.9) : 0;
  const bob = 4 * intensity;
  const legSwing = 24 * intensity;
  // Each arm swings mostly INWARD (inward = "forward", crossing toward the
  // body's centerline) and only a little outward ("back") — a wide
  // side-to-side pendulum reads as flailing, not running. Keyframe values
  // are written out explicitly per arm (not derived via a shared angle +
  // sign flip) so the two arms are guaranteed to be in opposite phase —
  // relying on animation `delay` for that turned out fragile.
  const forward = 32 * intensity; // how far the hand swings toward center
  const backward = 10 * intensity; // how far it swings away, out to the side
  // A single shared transition object applied to BOTH the running keyframe
  // loop and the idle single-value target was the actual bug behind the
  // "still moving when it should be idle" glitch: `repeat: Infinity` on a
  // transition whose target is a constant number makes some animation
  // engines keep re-running the settle animation from its last start point
  // instead of just holding still once it arrives. Idle now gets its own
  // non-repeating transition so it genuinely comes to rest.
  const runTransition = { duration: cycle, repeat: Infinity, ease: "easeInOut" as const };
  const idleTransition = { duration: 0.4, ease: "easeOut" as const };

  return (
    <div className="relative flex flex-col items-center justify-end" style={{ height: 132, width: 100 }}>
      <svg
        width="100"
        height="150"
        viewBox="0 0 100 150"
        style={{ overflow: "visible", filter: "drop-shadow(0 0 12px rgba(34,211,238,0.5))" }}
      >
        <defs>
          <linearGradient id="rc-suit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="rc-limb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <radialGradient id="rc-head" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <motion.ellipse
          cx="50"
          cy="140"
          rx="16"
          ry="3.5"
          fill="rgba(34,211,238,0.28)"
          animate={
            isRunning ? { rx: [16, 12, 16], opacity: [0.5, 0.25, 0.5] } : { rx: 14, opacity: 0.35 }
          }
          transition={isRunning ? runTransition : idleTransition}
        />

        {/* Whole figure: hover/run bob + forward lean, pivoting around the hips */}
        <motion.g
          style={pivot(50, 78)}
          animate={
            isRunning
              ? { y: [0, -bob, 0], rotate: [lean - 1.5, lean + 1.5, lean - 1.5] }
              : { y: [0, -2, 0], rotate: [0, 1, 0] }
          }
          transition={{ duration: isRunning ? cycle : 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* ── Legs — same explicit-opposite-keyframes approach as the arms,
              so the two legs are guaranteed to alternate rather than relying
              on an animation `delay` to create the phase offset. ── */}
          {[
            { hip: L_HIP, keys: [legSwing, -legSwing, legSwing] },
            { hip: R_HIP, keys: [-legSwing, legSwing, -legSwing] },
          ].map((leg, i) => (
            <SwingGroup
              key={i}
              cx={leg.hip.x}
              cy={leg.hip.y}
              keys={isRunning ? leg.keys : null}
              idle={0}
              dur={cycle}
            >
              {/* Thigh + shin drawn as one straight capsule from hip to ankle — a single
                  clean pivot per leg is far more robust than a nested knee joint, and
                  reads perfectly fine for a small on-screen runner. */}
              <rect x={leg.hip.x - 4.5} y={leg.hip.y} width="9" height="42" rx="4.5" fill="url(#rc-limb)" stroke="#3b82f6" strokeWidth="1" />
              <ellipse cx={leg.hip.x} cy={leg.hip.y + 44} rx="6.5" ry="4" fill="#0ea5e9" />
            </SwingGroup>
          ))}
          {/* Hip sockets on top of the leg tops, so the waistline always covers the pivot */}
          <rect x={L_HIP.x - 5} y={L_HIP.y - 4} width="10" height="8" rx="3" fill="url(#rc-suit)" />
          <rect x={R_HIP.x - 5} y={R_HIP.y - 4} width="10" height="8" rx="3" fill="url(#rc-suit)" />

          {/* ── Torso ── */}
          <path
            d="M 30 34 Q 26 56 39 64 L 39 80 L 61 80 L 61 64 Q 74 56 70 34 Z"
            fill="url(#rc-suit)"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <line x1="50" y1="38" x2="50" y2="76" stroke="rgba(103,232,249,0.5)" strokeWidth="1" />
          <motion.g
            style={pivot(50, 55)}
            animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M50 45 L58 48 V55 C58 60 54.5 63.5 50 65 C45.5 63.5 42 60 42 55 V48 Z"
              fill="rgba(34,211,238,0.2)"
              stroke="#22d3ee"
              strokeWidth="1.3"
            />
            <path d="M46.5 55 L49 57.5 L54 52" stroke="#67e8f9" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>

          {/* ── Arms — each arm is ONE continuous stroked path (shoulder → elbow
              → hand) with a natural bend baked into the geometry, so the upper
              arm and forearm are physically a single piece and can never
              separate. Only the shoulder pivot animates — the nested animated
              elbow pivot was the recurring source of the "floating forearm"
              glitch, so it's gone entirely. Left and right keep their own
              explicit opposite-phase keyframe arrays. ── */}
          {[
            {
              shoulder: L_SHOULDER,
              bendX: 10, // forearm angles inward, toward the body's centerline
              shoulderKeys: [-backward, forward, -backward],
              idleRotate: -6,
            },
            {
              shoulder: R_SHOULDER,
              bendX: -10,
              shoulderKeys: [forward, -backward, forward],
              idleRotate: 6,
            },
          ].map((arm, i) => {
            const { x: sx, y: sy } = arm.shoulder;
            const elbow = { x: sx, y: sy + 15 };
            const hand = { x: sx + arm.bendX, y: sy + 27 };
            const limbPath = `M ${sx} ${sy} L ${elbow.x} ${elbow.y} L ${hand.x} ${hand.y}`;
            return (
              <SwingGroup
                key={i}
                cx={sx}
                cy={sy}
                keys={isRunning ? arm.shoulderKeys : null}
                idle={arm.idleRotate}
                dur={cycle}
              >
                {/* Outline pass, then fill pass — gives the capsule-with-border look */}
                <path d={limbPath} fill="none" stroke="#3b82f6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                <path d={limbPath} fill="none" stroke="url(#rc-limb)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                {/* Elbow accent */}
                <circle cx={elbow.x} cy={elbow.y} r="2.4" fill="#60a5fa" />
                {/* Hand */}
                <circle cx={hand.x} cy={hand.y} r="3.6" fill="#38bdf8" />
              </SwingGroup>
            );
          })}
          {/* Shoulder pauldrons on top of the arm tops */}
          <circle cx={L_SHOULDER.x} cy={L_SHOULDER.y} r="6" fill="url(#rc-suit)" stroke="#60a5fa" strokeWidth="1" />
          <circle cx={R_SHOULDER.x} cy={R_SHOULDER.y} r="6" fill="url(#rc-suit)" stroke="#60a5fa" strokeWidth="1" />

          {/* ── Neck + Head ── */}
          <rect x="46" y="30" width="8" height="8" fill="#1e3a8a" />
          <SwingGroup
            cx={50}
            cy={22}
            keys={isRunning ? [-lean * 0.5, lean * 0.3, -lean * 0.5] : null}
            idle={0}
            dur={cycle * 1.1}
          >
            <ellipse cx="50" cy="21" rx="11" ry="12" fill="url(#rc-head)" stroke="#7dd3fc" strokeWidth="2" />
            <ellipse cx="45" cy="15" rx="4" ry="3" fill="rgba(255,255,255,0.35)" />
            <rect x="41" y="21" width="18" height="7" rx="3.5" fill="#00131b" stroke="rgba(34,211,238,0.6)" strokeWidth="1" />
            <motion.rect
              y="22.5"
              width="6"
              height="4"
              rx="2"
              fill="#67e8f9"
              animate={{ x: [42.5, 51.5, 42.5] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 4px #67e8f9)" }}
            />
          </SwingGroup>
        </motion.g>
      </svg>
    </div>
  );
}
