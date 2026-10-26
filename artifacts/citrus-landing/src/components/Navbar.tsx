import React from "react";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import "@/pages/landing.css";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="lp" data-theme={theme === "light" ? "light" : undefined}>
      <nav aria-label="Main navigation">
        <div className="nav-in">
          <Link className="mark" href="/">
            Active8 <i aria-hidden="true"></i>{" "}
            <small>by RequisorAI — experiential games &amp; brand activations</small>
          </Link>
          <div className="nav-r">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title="Toggle light/dark mode"
            >
              <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
              <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </button>
            <Link className="btn" href="/games">
              Try Active8
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
