import React from "react";
import { motion } from "framer-motion";

export function CTA() {
  return (
    <section id="contact" className="py-32 relative overflow-hidden flex items-center justify-center scroll-mt-20">
      {/* Electric background glow */}
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute top-1/2 left-1/2 w-full max-w-[800px] h-[300px] bg-primary/30 rounded-[100%] blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-10 tracking-tight leading-tight">
            Want a game like this for your brand?
          </h2>
          <a
            href="mailto:naveen@requisor.io?subject=Game Inquiry&body=Hi, I’m interested in your booth games."
            className="inline-block px-10 py-5 bg-primary text-primary-foreground font-bold text-lg rounded-xl
            hover:opacity-90 transition-all
            shadow-lg
            transform hover:-translate-y-1"
          >
            Get in Touch
          </a>
        </motion.div>
      </div>
    </section>
  );
}
