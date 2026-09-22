import React from "react";
import { SiX, SiGithub, SiDribbble, SiInstagram, SiGmail  } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

export function Footer() {
  return (
    <footer className="relative bg-muted border-t border-border py-12 overflow-hidden">
      {/* Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-primary/5 pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        {/* Logo / Brand */}
        <div
          className="font-bold text-xl tracking-tight
          bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#5eead4]
          text-transparent bg-clip-text"
        >
          Requisor.AI
        </div>

        {/* Copyright */}
        <div className="text-muted-foreground text-sm font-mono tracking-wide">
          © 2026 Requisor.AI · All rights reserved.
        </div>

        {/* Social Icons */}
        <div className="flex items-center gap-4">
          {[
            { icon: <SiX size={18} />, link: "https://x.com/Requisor_AI" },
           
            { icon: <SiInstagram size={18} />, link: "#" },
            { icon: <SiGmail size={18} />, link: "mailto:naveen@requisor.io" },
            
            {
              icon: <FaLinkedinIn size={18} />,
              link: "https://www.linkedin.com/company/requisor/",
            },
          ].map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              className="group relative w-11 h-11 rounded-xl bg-card border border-border
              flex items-center justify-center text-muted-foreground
              hover:text-primary transition-all duration-300 overflow-hidden"
            >
              {/* Glow effect */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition
                bg-primary/10 blur-md"
              />

              {/* Icon */}
              <span className="relative z-10 group-hover:scale-110 transition-transform">
                {item.icon}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Bottom cyber line */}
      <div
        className="absolute bottom-0 left-0 w-full h-[2px]
        bg-gradient-to-r from-transparent via-primary to-transparent opacity-40"
      />
    </footer>
  );
}
