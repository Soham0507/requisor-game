import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Home, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

// Shared header for /games and /customize/:slug. It used to carry a
// Home/Games/Team/Contact menu (plus a mobile hamburger dropdown for it),
// but those links pointed at #team/#contact anchors that only ever existed
// on the old landing page — the current one (src/pages/home.tsx) has no
// such sections, so they silently went nowhere. Replaced with a single Home
// button back to "/"; the games catalog itself is one click from there
// ("View our games"), and the customize page already has its own
// "Back to catalog" link.
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo/dino.png" alt="Citrus Innovations logo" className="w-10 h-10 rounded-md" />
          <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            RequisorAI
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title="Toggle light/dark mode"
            className="w-10 h-10 rounded-full grid place-items-center bg-muted border border-border text-foreground hover:bg-secondary transition-colors"
          >
            {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground border border-primary-border px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Home size={16} />
            Home
          </Link>
        </div>
      </div>
    </header>
  );
}
