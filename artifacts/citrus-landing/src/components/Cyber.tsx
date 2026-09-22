import React from "react";
import { motion } from "framer-motion";

const projects = [
  {
    company: "AppViewX",
    logo: "/logo/app1.png",
    game: "Basketball Game",
    preview: "/logo/app1.mp4",
    demo: "https://appviewx6.requisor.io",

    // 🎨 Brand Colors
    colors: ["#FD3629", "#DA2A51", "#6708DA"],

    challenge:
      "At cybersecurity exhibitions, AppViewX needed a way to quickly capture attention and keep visitors engaged at their booth.",

    solution:
      "We developed a fast-paced basketball game optimized for booth interaction — easy to start, highly engaging, and designed for repeat plays.",

    outcome:
      "Significantly improved footfall retention and created a fun, interactive entry point for product conversations.",
  },

  {
    company: "Peak Technology",
    logo: "/logo/peak.png",
    game: "Cyber Runner Game",
    preview: "/logo/cyber.mp4",
    demo: "https://cybersecurity.requisor.io/",

    // 🎨 Brand Colors
    colors: ["#FCD07E", "#FEC553", "#FFBF3F"],

    challenge:
      "Peak Technology wanted a more immersive and theme-driven experience aligned with cybersecurity concepts.",

    solution:
      "We built a cyber-themed endless runner game inspired by digital threats and security environments, creating a strong thematic connection.",

    outcome:
      "Enhanced user immersion and delivered a memorable experience aligned with cybersecurity storytelling.",
  },

  {
    company: "Peak Technology",
    logo: "/logo/peak.png",
    game: "Soccer Game",
    preview: "/logo/soccer1.mp4",
    demo: "https://your-demo-link.com/avistar",

    // 🎨 Brand Colors
    colors: ["#FCD07E", "#FEC553", "#FFBF3F"],

    challenge:
      "Needed an additional game format to engage a broader audience while maintaining development efficiency.",

    solution:
      "We reused the core gameplay logic from the basketball game and adapted it into a soccer-based experience with optimized mechanics.",

    outcome:
      "Enabled multiple engaging game formats with faster delivery and consistent user experience.",
  },
  {
    company: "Peak Technology",
    logo: "/logo/peak.png",
    game: "Lazer Shooter",
    colors: ["#FCD07E", "#FEC553", "#FFBF3F"],
    preview: "/logo/lazer.mp4",
    demo: "https://ai.studio/apps/7168d6f7-e6cb-45a2-bd22-e6d113ceb891?fullscreenApplet=true",
    challenge:
      "Needed an additional game format to engage a broader audience while maintaining development efficiency.",
    solution:
      "Developed a fast, interactive web-based game designed for instant engagement in physical environments Leveraged intelligent gameplay systems.",
    outcome:
      "Enabled multiple engaging game formats with faster delivery and consistent user experience.",
  },
  {
    company: "Avistar",
    logo: "/logo/avistar.png",
    game: "Basketball Game (Custom UI)",
    preview: "/logo/avistart1.png",
    demo: "https://basket-ball-for-avistar.replit.app/",
    type: "image",
    // 🎨 Brand Colors
    colors: ["#29CAE0", "#1C90DD", "#1C41DD"],

    challenge:
      "Avistar required a game experience that not only engaged users but also visually aligned with their brand identity.",

    solution:
      "We customized our proven basketball game engine with Avistar’s branding — including UI, colors, and visual elements — ensuring a seamless brand experience.",

    outcome:
      "Delivered a branded, high-engagement experience that strengthened visual identity while maintaining gameplay performance.",
  },
  {
    company: "Requisor.AI",
    logo: "/logo/dino.png",
    game: "90's Space War",
    preview: "/logo/90.mp4",
    demo: "https://90sspacewar.requisor.io/",

    // 🎨 Brand Colors
    colors: ["#17CFA1", "#5EB09E", "#74B19F"],

    challenge:
      "Needed an Nostalgiatic game what gives classical 90's vibe",

    solution:
      "We reused the core gameplay logic from the space war game additionally enabeling hand gesture control access.",

    outcome:
      "Enabled Hand gesture controlled game formats with faster delivery and consistent user experience.",
  },

  {
    company: "Requisor.AI",
    logo: "/logo/dino.png",
    game: "Space Shooter",
    preview: "/logo/spaceshooter.mp4",
    demo: "https://90sspacewar.requisor.io/",

    // 🎨 Brand Colors
    colors: ["#17CFA1", "#5EB09E", "#74B19F"],

    challenge:
      "Build a polished, browser-based 2D space shooter game inside a React + Vite frontend dashboard",

    solution:
      " Implemented a complete HTML5 canvas game loop with mouse aiming, click-to-shoot, asteroid spawning and collision detection",

    outcome:
      "The game runs smoothly without any crash overlays in both development and production.",
  },
];
function SectionTitle({ title, subtitle }: any) {
  return (
    <div className="text-center mb-16">
      <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
        {title}
      </h2>
      <p className="text-primary/80 font-mono">{subtitle}</p>
    </div>
  );
}

function CaseCard({ item, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className="group bg-card rounded-2xl overflow-hidden
      hover:shadow-lg transition-all duration-300" style={{
        border: `2px solid ${item.colors[0]}40`,
        boxShadow: `0 0 30px ${item.colors[1]}30`
      }}
    >
      {/* 🎥 GAME PREVIEW */}
        <div className="relative h-52 overflow-hidden">
          {item.type === "image" ? (
            <img
              src={item.preview}
              className="w-full h-full object-fit group-hover:scale-110 transition duration-500"
            />
          ) : (
            <video
              src={item.preview}
              autoPlay
              loop
              muted
              className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
            />
          )}



        {/* 🎮 Play Button */}
        <a
          href={item.demo}
          target="_blank"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        >
          <div
            className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg
          shadow-lg hover:scale-110 transition"
          >
            ▶ Play Demo
          </div>
        </a>
      </div>

      {/* CONTENT */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <img src={item.logo} alt={`${item.company} logo`} className="w-10 h-10 bg-white rounded-md" />
          <div>
            <h3
              className="font-bold"
              style={{
                color: item.colors[0],
                textShadow: `0 0 10px ${item.colors[0]}66`
              }}
            >
              {item.company}
            </h3>
            <p 
              className="text-sm"
              style={{ color: item.colors[1] }}
            >
              {item.game}
            </p>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3 text-sm">
          <p className="text-foreground/70">
            <span
              style={{ color: item.colors[2] }}
              className="uppercase text-xs"
            >
              Challenge:
            </span> {item.challenge}
          </p>
          <p className="text-foreground/70">
            <span className="text-muted-foreground">Solution:</span> {item.solution}
          </p>
          <p style={{ color: item.colors[1] }}>
            <span style={{ color: item.colors[2] }}>Outcome:</span> {item.outcome}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function CyberCaseStudy() {
  return (
    <section className="bg-muted text-foreground relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-40
        bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),
        linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)]
        bg-[size:50px_50px]"
      />

      <div className="container mx-auto px-6 md:px-12 py-24 relative z-10">
        {/* HERO */}
        <SectionTitle
          title="Cyber Security Gaming Solutions"
          subtitle="// Built for Booth Engagement & Brand Interaction"
        />

        {/* INTRO */}
        <div className="max-w-3xl mx-auto text-center mb-20 text-muted-foreground leading-relaxed">
          We design and develop interactive web-based games specifically for
          cybersecurity companies, helping them attract, engage, and retain
          audiences at exhibitions and events.
        </div>

        {/* LOGO STRIP */}
        {/* LOGO STRIP */}
        <div className="flex flex-wrap justify-center gap-8 mb-20 opacity-80">
          <div className="relative group">
            <img src="/logo/app1.png" alt="AppViewX logo" className="h-12 rounded-sm" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              AppViewX
            </span>
          </div>
          <div className="relative group">
            <img src="/logo/avistar.png" alt="Avistar logo" className="h-12 bg-white rounded-md" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Avistar
            </span>
          </div>
          <div className="relative group">
            <img src="/logo/peak.png" alt="Peak logo" className="h-12 rounded-md" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Peak
            </span>
          </div>
        </div>

        {/* CASE STUDIES */}
        <SectionTitle title="Our Work" subtitle="// Real Projects Delivered" />

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-24">
          {projects.map((item, i) => (
            <CaseCard key={i} item={item} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">
            Want a Cyber Game for Your Brand?
          </h3>
          <p className="text-muted-foreground mb-6">
            Let’s build an interactive experience that attracts and engages your
            audience.
          </p>
          <a
            href="#contact"
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl
            hover:opacity-90 transition shadow-lg"
          >
            Get Your Custom Game
          </a>
        </div>
      </div>
    </section>
  );
}
