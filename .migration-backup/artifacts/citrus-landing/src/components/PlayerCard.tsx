import React, { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface TeamMember {
  name: string;
  role: string;
  desc: string;
  img: string;
  linkedin: string;
}

interface PlayerCardProps {
  member: TeamMember;
  index: number;
}

function PlayerCard({ member, index }: PlayerCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Mouse position for tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Transform values for 3D tilt
  const rotateX = useTransform(mouseY, [-150, 150], [12, -12]);
  const rotateY = useTransform(mouseX, [-150, 150], [-12, 12]);

  // For shine effect
  const shineX = useTransform(mouseX, [-150, 150], [0, 100]);
  const shineY = useTransform(mouseY, [-150, 150], [0, 100]);

  function handleMouseMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate mouse position relative to card center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const px = e.clientX - centerX;
    const py = e.clientY - centerY;

    mouseX.set(px);
    mouseY.set(py);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.2, duration: 0.6 }}
      className="relative group h-full"
    >
      {/* Gradient Border Glow - like ::after in original */}
      <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-[#0d9488] via-[#14b8a6] to-[#5eead4] opacity-55   group-hover:opacity-70 transition duration-500" />

      {/* Main Gradient Border - like ::before in original */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0d9488] via-[#14b8a6] to-[#5eead4] blur-xl " />

      {/* Inner Dark Overlay - like <b> element */}
      <div className="absolute inset-[2px] rounded-2xl bg-black/80 z-10" />

      {/* Glass Card Content */}
      <div className="relative z-20 h-full flex flex-col rounded-2xl p-6 backdrop-blur-sm bg-black/40 overflow-hidden">

        {/* Dynamic Shine Effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 80%)`,
          }}
        />

        {/* Avatar with gradient ring */}
        <div className="relative w-28 h-28 mx-auto mb-5">
          {/* Avatar glow ring */}
          

          <div className="relative w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#0d9488] via-[#14b8a6] to-[#5eead4] p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-black/60">
              <img
                src={member.img}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Info with 3D text effect */}
        <div style={{ transform: "translateZ(20px)" }}>
          <h3 className="text-xl font-bold text-white text-center tracking-wide">
            {member.name}
          </h3>

          <p className="text-sm text-center mb-2 bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#5eead4] bg-clip-text text-transparent font-semibold">
            {member.role}
          </p>

          <p className="text-white/50 text-sm text-center leading-relaxed">
            {member.desc}
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-auto pt-5" style={{ transform: "translateZ(15px)" }}>
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="relative px-5 py-2 text-xs font-medium rounded-lg overflow-hidden group/btn transition-all duration-300"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/50 via-[#14b8a6]/50 to-[#5eead4]/50 rounded-lg" />
            <span className="absolute inset-[1px] bg-black/80 rounded-lg" />
            <span className="relative text-white/80 group-hover/btn:text-white transition">
              View Profile →
            </span>
          </a>
        </div>

        {/* XP Bar with gradient */}
        <div className="mt-5" style={{ transform: "translateZ(10px)" }}>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#5eead4]"
              initial={{ width: "0%" }}
              whileInView={{ width: "85%" }}
              transition={{ duration: 1.2, delay: 0.5 + index * 0.1 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default PlayerCard;