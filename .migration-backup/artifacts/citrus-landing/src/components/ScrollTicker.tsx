import React from "react";

const items = [
  "Basketball Game",
  "Soccer Game",
  "Cyber Adventure",
  "Gesture Controls",
  "Real-time Scoring",
  "Brand Gamification",
  "Custom Development",
  "Endless Runner",
  "Multiplayer Ready",
  "UI/UX Design",
  "Game Reskinning",
  "Phishing Defense",
];

export function ScrollTicker() {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden bg-white/[0.02] border-y border-white/5 py-4">
      {/* Fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        className="flex gap-10 w-max"
        style={{
          animation: "ticker 30s linear infinite",
        }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-10 whitespace-nowrap">
            <span className="text-sm font-semibold tracking-widest text-white/30 uppercase">
              {item}
            </span>
            <span className="text-orange-500/40 text-lg font-bold">✦</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
