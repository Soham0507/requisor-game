import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

function useCounter(end: number, duration: number = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration]);

  return { count, ref };
}

const stats = [
  { rank: "01", label: "Games Built", end: 3, suffix: "", accent: "text-orange-400", glow: "shadow-[0_0_20px_rgba(249,115,22,0.2)]" },
  { rank: "02", label: "Brands Served", end: 3, suffix: "", accent: "text-purple-400", glow: "shadow-[0_0_20px_rgba(168,85,247,0.2)]" },
  { rank: "03", label: "Client Rating", end: 4, suffix: ".9 / 5", accent: "text-green-400", glow: "shadow-[0_0_20px_rgba(74,222,128,0.2)]" },
];

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const { count, ref } = useCounter(stat.end, 1800 + index * 200);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`relative group w-[280px] sm:w-[325px] 
      bg-white/[0.03] border border-white/8 rounded-2xl p-8 
      hover:bg-white/[0.06] transition-all duration-300 
      ${stat.glow} hover:border-white/15 overflow-hidden`}
    >
      {/* Rank badge */}
      <div className="font-mono text-white/10 text-5xl font-bold absolute top-4  select-none pointer-events-none group-hover:text-white/5 transition-colors">
        #{stat.rank}
      </div>

      {/* Scan line on hover */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <div className={`text-5xl md:text-6xl font-extrabold font-mono mb-2 ${stat.accent}`}>
          {count}{stat.suffix}
        </div>
        <div className="text-white/50 text-sm uppercase tracking-widest font-semibold">
          {stat.label}
        </div>
        <div className="mt-4 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${
              stat.accent === "text-orange-400" ? "from-orange-500 to-orange-300" :
              stat.accent === "text-cyan-400" ? "from-cyan-500 to-cyan-300" :
              stat.accent === "text-purple-400" ? "from-purple-500 to-purple-300" :
              "from-green-500 to-green-300"
            }`}
            initial={{ width: "0%" }}
            whileInView={{ width: `${Math.min((stat.end / (stat.end * 1.2)) * 100, 100)}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.3 + index * 0.1, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function Stats() {
  return (
    <section className="py-24 relative border-t border-white/5">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/40 uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Leaderboard
          </div>
          <h2 className="text-4xl md:text-6xl mt-10 font-bold text-white">
            By the Numbers
          </h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto"> 
          
          
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
