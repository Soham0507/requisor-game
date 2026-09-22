import React from "react";
import { motion, type Variants } from "framer-motion";

function BasketballScreen() {
  return (
    <div className="relative w-full h-28 bg-[#1a0a00] rounded-t-xl overflow-hidden border-b border-orange-500/20">
      {/* Court lines */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-orange-500/30" />
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-orange-500/20 -translate-x-1/2" />
      {/* Arc */}
      <svg className="absolute bottom-0 left-1/2 -translate-x-1/2" width="100" height="60" viewBox="0 0 100 60">
        <path d="M10 60 Q50 0 90 60" stroke="rgba(249,115,22,0.3)" strokeWidth="1.5" fill="none" />
      </svg>
      {/* Hoop */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-orange-500/60 rounded-full" />
      <div className="absolute top-4.5 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-orange-500/30" />
      {/* Bouncing ball */}
      <motion.div
        className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.6)]"
        style={{ left: "48%", top: 8 }}
        animate={{ y: [0, 60, 0], x: [0, 10, -5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn" }}
      />
      {/* Score */}
      <div className="absolute top-2 right-3 font-mono text-orange-400/70 text-xs font-bold">24 - 18</div>
      {/* Timer */}
      <div className="absolute top-2 left-3 font-mono text-white/30 text-xs">02:34</div>
    </div>
  );
}

function SoccerScreen() {
  return (
    <div className="relative w-full h-28 bg-[#0a1a0a] rounded-t-xl overflow-hidden border-b border-green-500/20">
      {/* Field */}
      <div className="absolute inset-2 border border-green-500/20 rounded" />
      <div className="absolute left-1/2 top-2 bottom-2 w-[1px] bg-green-500/20 -translate-x-1/2" />
      <div className="absolute left-1/2 top-1/2 w-10 h-10 rounded-full border border-green-500/20 -translate-x-1/2 -translate-y-1/2" />
      {/* Goals */}
      <div className="absolute left-2 top-1/2 w-2 h-8 border border-green-500/30 -translate-y-1/2" />
      <div className="absolute right-2 top-1/2 w-2 h-8 border border-green-500/30 -translate-y-1/2" />
      {/* Rolling ball */}
      <motion.div
        className="absolute w-4 h-4 rounded-full bg-white/80 border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
        animate={{ x: [20, 120, 60, 20], y: [40, 30, 60, 40] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Score */}
      <div className="absolute top-2 right-3 font-mono text-green-400/70 text-xs font-bold">3 - 1</div>
      <div className="absolute top-2 left-3 font-mono text-white/30 text-xs">LIVE</div>
    </div>
  );
}

function CyberScreen() {
  const lines = ["ALERT: phishing_detected.exe", "> firewall activated...", "THREAT: malware.dll blocked", "> scanning network...", "STATUS: system secure"];
  return (
    <div className="relative w-full h-28 bg-[#000a00] rounded-t-xl overflow-hidden border-b border-green-400/20 font-mono">
      <div className="absolute inset-0 p-2 flex flex-col gap-0.5 overflow-hidden">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4, delay: i * 0.8, repeat: Infinity, repeatDelay: lines.length * 0.8 - i * 0.8 }}
            className={`text-[9px] truncate ${line.startsWith("ALERT") || line.startsWith("THREAT") ? "text-red-400/80" : line.startsWith("STATUS") ? "text-green-400/80" : "text-green-500/50"}`}
          >
            {line}
          </motion.div>
        ))}
      </div>
      {/* Scanline */}
      <motion.div
        className="absolute inset-x-0 h-[2px] bg-green-400/10 pointer-events-none"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute top-2 right-3 text-green-400/50 text-[9px]">SYS v2.4</div>
    </div>
  );
}

const games = [
  {
    title: "Basketball Game",
    description: "Gesture-based controls, real-time scoring, and smooth gameplay mechanics designed for maximum engagement.",
    screen: BasketballScreen,
    tags: ["Gesture Controls", "Real-time Scoring", "Multiplayer"],
    color: "from-orange-500/20 to-orange-500/0",
    borderHover: "group-hover:border-orange-500/50",
    glow: "group-hover:shadow-[0_0_40px_rgba(249,115,22,0.12)]",
    accent: "text-orange-400",
    bar: "from-orange-500 to-yellow-400",
  },
  {
    title: "Soccer Game",
    description: "Fast-paced gameplay with the same core engine as basketball, fully customizable for client campaigns and events.",
    screen: SoccerScreen,
    tags: ["Fast-paced", "Customizable", "Brand Ready"],
    color: "from-green-500/20 to-green-500/0",
    borderHover: "group-hover:border-green-500/50",
    glow: "group-hover:shadow-[0_0_40px_rgba(34,197,94,0.12)]",
    accent: "text-green-400",
    bar: "from-green-500 to-emerald-400",
  },
  {
    title: "Cyber Adventure",
    description: "Temple-run style endless runner with a cybersecurity theme. Dodge phishing attacks, block malware. Educational and addictive.",
    screen: CyberScreen,
    tags: ["Endless Runner", "Educational", "Cybersecurity"],
    color: "from-purple-500/20 to-purple-500/0",
    borderHover: "group-hover:border-purple-500/50",
    glow: "group-hover:shadow-[0_0_40px_rgba(168,85,247,0.12)]",
    accent: "text-purple-400",
    bar: "from-purple-500 to-pink-400",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function Games() {
  return (
    <section id="games" className="py-32 bg-background relative border-t border-white/5">
      {/* Subtle bg glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/5 to-transparent" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="mb-16 md:mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/40 uppercase tracking-widest mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Game Library
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl font-bold text-white mb-4"
          >
            Our Games
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-20 h-1 bg-gradient-to-r from-orange-500 to-pink-500 mx-auto rounded-full"
          />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {games.map((game, index) => {
            const Screen = game.screen;
            return (
              <motion.div key={index} variants={itemVariants} className="h-full">
                <div className={`group h-full relative rounded-2xl bg-card border border-white/10 transition-all duration-500 overflow-hidden ${game.borderHover} ${game.glow}`}>
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${game.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  {/* Mini game screen */}
                  <Screen />

                  <div className="relative z-10 p-7 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-3">{game.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-grow mb-5">
                      {game.description}
                    </p>

                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {game.tags.map((tag, t) => (
                        <span key={t} className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-white/5 border border-white/10 text-white/50">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Engagement bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-white/30 uppercase tracking-wider">
                        <span>Engagement</span>
                        <span className={game.accent}>High</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${game.bar}`}
                          initial={{ width: "0%" }}
                          whileInView={{ width: index === 0 ? "92%" : index === 1 ? "87%" : "95%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <div className={`mt-5 flex items-center text-sm font-semibold ${game.accent} opacity-60 group-hover:opacity-100 transition-all`}>
                      Explore game
                      <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
