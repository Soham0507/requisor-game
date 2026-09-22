import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-background"
    >
      {/* Static brand-color glow — no motion, just depth behind the content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px circle at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%), " +
            "radial-gradient(500px circle at 85% 30%, hsl(var(--secondary) / 0.10), transparent 70%)",
        }}
      />

      {/* Faint static grid, matches the texture used elsewhere on the site */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(0,0,0,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.4)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="container mx-auto px-6 md:px-12 relative z-10 text-center max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Web-Based Games
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground mb-6">
            Interactive games, built for <span className="text-primary">booth experiences</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Web-based interactive games designed for exhibition booths, brand activations, and on-ground engagement.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/games">
              <Button size="lg" className="w-full sm:w-auto">
                View Our Games
              </Button>
            </Link>
            <a href="#contact" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Contact Us
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
