import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import "./landing.css";

// Transcribed from a static design mockup ("Immerse by RequisorAI"). Markup
// and behavior are preserved as closely as JSX allows; see landing.css for
// how the original <style> block was scoped under the `.lp` wrapper below so
// it can't leak onto the Navbar/Footer shared with /games and /customize.
export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLCanvasElement>(null);
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const maniRef = useRef<HTMLParagraphElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState<{ text: string; ok: boolean }>({ text: "", ok: false });

  // Shared with the Navbar toggle on /games and /customize (src/hooks/use-theme.ts)
  // so the preference — and the `dark` class it drives on <html> for those
  // pages' Tailwind styles — stays the same wherever it was last set.
  const { theme, setTheme } = useTheme();

  function toggleTheme() {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = theme === "light" ? "dark" : "light";
    const apply = () => setTheme(next);
    if (reduced) {
      apply();
      return;
    }
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      const root = rootRef.current;
      root?.classList.add("theme-anim");
      apply();
      setTimeout(() => root?.classList.remove("theme-anim"), 650);
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- game preview videos: force-play, fall back to visible controls ---------- */
    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLVideoElement>("video.gvid").forEach((v) => {
      const tryPlay = () => v.play().catch(() => {});
      tryPlay();
      const onPlaying = () => {
        v.controls = false;
      };
      const onClick = () => {
        if (v.paused) tryPlay();
      };
      v.addEventListener("loadeddata", tryPlay);
      v.addEventListener("canplay", tryPlay);
      v.addEventListener("playing", onPlaying);
      v.addEventListener("click", onClick);
      const t = setTimeout(() => {
        if (v.paused) v.controls = true;
      }, 1800);
      cleanups.push(() => {
        v.removeEventListener("loadeddata", tryPlay);
        v.removeEventListener("canplay", tryPlay);
        v.removeEventListener("playing", onPlaying);
        v.removeEventListener("click", onClick);
        clearTimeout(t);
      });
    });

    /* ---------- hero light field (recolored to the game-arcade palette) ---------- */
    const cv = fieldRef.current;
    if (cv && !reduced) {
      const ctx = cv.getContext("2d")!;
      let W = 0,
        H = 0;
      const DPR = Math.min(devicePixelRatio || 1, 2);
      let mx = 0.5,
        my = 0.5,
        tmx = 0.5,
        tmy = 0.5;
      const COLORS = ["249,115,22", "236,72,153", "168,85,247", "34,211,238"];
      let beams: { x: number; w: number; c: string; sp: number; ph: number; a: number }[] = [];
      let dust: { x: number; y: number; r: number; v: number; c: string; o: number; ph: number }[] = [];

      function size() {
        if (!cv || !cv.parentElement) return;
        W = cv.parentElement.clientWidth;
        H = cv.parentElement.clientHeight;
        cv.width = W * DPR;
        cv.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        beams = Array.from({ length: 5 }, (_, i) => ({
          x: (i + 0.5) / 5,
          w: 0.1 + Math.random() * 0.14,
          c: COLORS[i % COLORS.length],
          sp: 0.0002 + Math.random() * 0.0003,
          ph: Math.random() * Math.PI * 2,
          a: 0.05 + Math.random() * 0.05,
        }));
        dust = Array.from({ length: Math.min(90, W / 12) }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.6 + Math.random() * 1.7,
          v: 0.04 + Math.random() * 0.14,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          o: 0.15 + Math.random() * 0.5,
          ph: Math.random() * Math.PI * 2,
        }));
      }
      size();
      const onResize = () => size();
      const onPointerMove = (e: PointerEvent) => {
        tmx = e.clientX / innerWidth;
        tmy = e.clientY / innerHeight;
      };
      addEventListener("resize", onResize);
      addEventListener("pointermove", onPointerMove, { passive: true });

      let raf = 0;
      function frame(t: number) {
        mx += (tmx - mx) * 0.015;
        my += (tmy - my) * 0.015;
        ctx.clearRect(0, 0, W, H);
        for (const b of beams) {
          const drift = Math.sin(t * b.sp + b.ph) * 0.05 + (mx - 0.5) * 0.05;
          const cx = (b.x + drift) * W;
          const g = ctx.createLinearGradient(cx - (b.w * W) / 2, 0, cx + (b.w * W) / 2, 0);
          g.addColorStop(0, "rgba(" + b.c + ",0)");
          g.addColorStop(0.5, "rgba(" + b.c + "," + (b.a + Math.sin(t * 0.0002 + b.ph) * 0.02) + ")");
          g.addColorStop(1, "rgba(" + b.c + ",0)");
          ctx.fillStyle = g;
          ctx.fillRect(cx - (b.w * W) / 2, 0, b.w * W, H);
        }
        for (const p of dust) {
          p.y -= p.v;
          p.x += Math.sin(t * 0.0003 + p.ph) * 0.08 + (mx - 0.5) * 0.2;
          if (p.y < -6) {
            p.y = H + 6;
            p.x = Math.random() * W;
          }
          const tw = p.o * (0.6 + 0.4 * Math.sin(t * 0.0007 + p.ph));
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + p.c + "," + tw + ")";
          ctx.arc(p.x, p.y, p.r, 0, 7);
          ctx.fill();
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      cleanups.push(() => {
        removeEventListener("resize", onResize);
        removeEventListener("pointermove", onPointerMove);
        cancelAnimationFrame(raf);
      });
    }

    /* ---------- card tilt ---------- */
    if (!reduced && matchMedia("(hover:hover)").matches) {
      root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(1200px) rotateY(" + x * 7 + "deg) rotateX(" + -y * 7 + "deg)";
        };
        const onLeave = () => {
          el.style.transform = "perspective(1200px) rotateX(0) rotateY(0)";
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    /* ---------- scroll reveals ---------- */
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16 },
    );
    root.querySelectorAll(".rv").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    /* ---------- manifesto word light-up ---------- */
    const mani = maniRef.current;
    if (mani) {
      const words = [...mani.querySelectorAll("span")];
      const litUp = () => {
        const r = mani.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (innerHeight * 0.78 - r.top) / (r.height + innerHeight * 0.35)));
        const n = Math.floor(prog * words.length * 1.15);
        words.forEach((w, i) => w.classList.toggle("on", i < n));
      };
      if (reduced) {
        words.forEach((w) => w.classList.add("on"));
      } else {
        addEventListener("scroll", litUp, { passive: true });
        litUp();
        cleanups.push(() => removeEventListener("scroll", litUp));
      }
    }

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitIdea(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const idea = ideaRef.current?.value.trim() ?? "";
    if (!idea) {
      setNote({ text: "Tell us a bit about the idea first.", ok: false });
      return;
    }
    const subject = "New game idea for Immerse";
    const bodyLines = [idea, "", "—", name ? "From: " + name : null, email ? "Reply to: " + email : null].filter(
      Boolean,
    );
    const mailto =
      "mailto:support@requisor.io?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyLines.join("\n"));
    window.location.href = mailto;
    setNote({ text: "Opening your email client — send it through and we’ll be in touch.", ok: true });
  }

  return (
    <div className="lp" ref={rootRef} data-theme={theme === "light" ? "light" : undefined} id="top">
      <nav>
        <div className="nav-in">
          <a className="mark" href="#top">
            Immerse <i></i> <small>by RequisorAI — games &amp; live experiences</small>
          </a>
          <div className="nav-r">
            <button
              ref={themeToggleRef}
              className="theme-toggle"
              type="button"
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title="Toggle light/dark mode"
              onClick={toggleTheme}
            >
              <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
              <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </button>
            <a className="btn" href="#start">
              Start a project
            </a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <canvas ref={fieldRef} id="field" aria-hidden="true"></canvas>

        <div className="orb" style={{ left: "10%", top: "22%", width: 60, height: 60, background: "radial-gradient(circle,rgba(249,115,22,.35),transparent)", animationDelay: "0s" }}></div>
        <div className="orb" style={{ left: "82%", top: "62%", width: 40, height: 40, background: "radial-gradient(circle,rgba(168,85,247,.35),transparent)", animationDelay: "1.2s" }}></div>
        <div className="orb" style={{ left: "62%", top: "16%", width: 34, height: 34, background: "radial-gradient(circle,rgba(34,211,238,.35),transparent)", animationDelay: ".6s" }}></div>
        <div className="orb" style={{ left: "22%", top: "72%", width: 50, height: 50, background: "radial-gradient(circle,rgba(59,130,246,.35),transparent)", animationDelay: "1.8s" }}></div>
        <div className="pxstar" style={{ left: "14%", top: "46%", animationDelay: "0s" }}>+</div>
        <div className="pxstar" style={{ left: "57%", top: "80%", animationDelay: "1s" }}>+</div>
        <div className="pxstar" style={{ left: "86%", top: "32%", animationDelay: "2s" }}>+</div>
        <div className="pxstar" style={{ left: "36%", top: "14%", animationDelay: ".5s" }}>+</div>

        <div className="wrap hero-in">
          <div className="hero-copy">
            <div className="kicker rise d1">
              <i></i>Web games · AI experiences · Live events
            </div>
            <h1 className="rise d2">
              Nobody remembers a booth.
              <br />
              Everyone remembers <span className="lit">the game they won.</span>
            </h1>
            <p className="rise d3">
              Immerse designs and builds interactive web games and AI-powered brand experiences for show floors,
              tours, and activations —{" "}
              <b>spectacle people step into, games they compete in, and moments they take home.</b>
            </p>
            <div className="row rise d4">
              <Link className="btn" href="/games">View our games</Link>
              <a className="btn line" href="#demos">Touch one right now</a>
            </div>
            <div className="tags rise d4">
              <span className="tag">Basketball</span>
              <span className="tag">Soccer</span>
              <span className="tag">Cyber Runner</span>
              <span className="tag">Lazer Shooter</span>
              <span className="tag">Retro Space Shooter</span>
              <span className="tag">Gamification</span>
            </div>
          </div>
          <div className="hero-booth rise d3" aria-hidden="true">
            <div className="dev dev-tv">
              <div className="screen">
                <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                  <source src="/logo/app1.mp4#t=0.1" type="video/mp4" />
                </video>
                <span className="tag2">AppViewX · Basketball</span>
              </div>
            </div>
            <div className="dev dev-tab">
              <div className="screen">
                <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                  <source src="/logo/soccer1.mp4#t=0.1" type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="dev dev-phone">
              <div className="screen">
                <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                  <source src="/logo/90.mp4#t=0.1" type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="booth-cap">One platform. Every screen.</div>
          </div>
        </div>
        <div className="hint" aria-hidden="true">Scroll</div>
      </header>

      <section className="manifesto">
        <div className="wrap">
          <p id="mani" ref={maniRef}>
            <span>An</span> <span>impression</span> <span>lasts</span> <span>three</span> <span>seconds.</span>{" "}
            <span>A</span> <span className="hot">game</span> <span>lasts</span> <span>as</span> <span>long</span>{" "}
            <span>as</span> <span>someone</span> <span>wants</span> <span>to</span> <span>keep</span>{" "}
            <span>playing.</span>
          </p>
          <div className="foot rv">
            Every game and experience we build is engineered around one question: what will this person tell someone
            else tomorrow? Attention is the entry fee. Memory is the return — and a high score is a great excuse to
            come back.
          </div>
        </div>
      </section>

      <section className="work" id="work">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Games and experiences, not installations.</h2>
            <p>Each one is a proven engine we reimagine end-to-end around your brand — the world, the stakes, the leaderboard.</p>
          </div>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FD3629" }}></i>AppViewX · Cybersecurity</div>
              <h3>Basketball Game</h3>
              <p className="story">
                At cybersecurity exhibitions, <b>AppViewX</b> needed to capture attention fast. We built a
                fast-paced, gesture-controlled basketball game optimized for booth interaction — easy to start,
                highly replayable, and running live for <b>47 straight days</b> with a floor-visible leaderboard
                driving repeat plays.
              </p>
              <div className="links"><a className="go" href="https://appviewx6.requisor.io/" target="_blank" rel="noopener">Play the demo →</a></div>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/app1.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Deployed · AppViewX Basketball</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FEC553" }}></i>Peak Technology · Endless runner</div>
              <h3>Cyber Runner</h3>
              <p className="story">
                <b>Peak Technology</b> wanted a more immersive, theme-driven booth experience. We built a
                cyber-themed endless runner inspired by digital threats — dodge phishing attacks, block malware,
                stay one step ahead of the breach — giving Peak a strong thematic tie to their product story.
              </p>
              <div className="links"><a className="go" href="https://cybersecurity.requisor.io/" target="_blank" rel="noopener">Play the demo →</a></div>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/cyber.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Deployed · Peak Technology Cyber Runner</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FEC553" }}></i>Peak Technology · Reused engine</div>
              <h3>Soccer Game</h3>
              <p className="story">
                Same core engine as our basketball game, reskinned into a fast-paced soccer match. Built to give{" "}
                <b>Peak Technology</b> a second game format — a broader audience, faster delivery, and a consistent
                experience across both builds.
              </p>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/soccer1.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Deployed · Peak Technology Soccer</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FEC553" }}></i>Peak Technology · Reflex arcade</div>
              <h3>Lazer Shooter</h3>
              <p className="story">
                A fast, instant-engagement arcade shooter built for physical environments — designed to pull a
                crowd from across the hall and hand every visitor a reason to stop and try to beat the score in
                front of them.
              </p>
              <div className="links"><a className="go" href="https://ai.studio/apps/7168d6f7-e6cb-45a2-bd22-e6d113ceb891?fullscreenApplet=true" target="_blank" rel="noopener">Play the demo →</a></div>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/lazer.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Deployed · Peak Technology Lazer Shooter</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#29CAE0" }}></i>Avistar · Custom branding</div>
              <h3>Basketball Game — Custom UI</h3>
              <p className="story">
                <b>Avistar</b> needed a game that engaged users while visually matching their brand identity. We
                reskinned our proven basketball engine with Avistar's UI, colors, and visual language — delivering
                a branded, high-engagement experience without touching gameplay performance.
              </p>
              <div className="links"><a className="go" href="https://basket-ball-for-avistar.replit.app/" target="_blank" rel="noopener">Play the demo →</a></div>
            </div>
            <div className="visual" data-tilt="">
              <img src="/logo/avistart1.png" alt="Avistar-branded basketball game UI" loading="lazy" />
              <div className="glass"></div>
              <div className="plate">Deployed · Avistar Basketball (Custom UI)</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#17CFA1" }}></i>Immerse · Nostalgia arcade</div>
              <h3>Retro Space Shooter</h3>
              <p className="story">
                A nostalgic, 90's-style arcade shooter — rebuilt with <b>hand-gesture controls</b> so guests wave
                and dodge their way through the game instead of touching a screen. A no-contact interaction booths
                ask for now, wrapped in retro-arcade charm.
              </p>
              <div className="links"><a className="go" href="https://90sspacewar.requisor.io/" target="_blank" rel="noopener">Play the demo →</a></div>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/90.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Deployed · Retro Space Shooter</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#17CFA1" }}></i>Immerse · HTML5 canvas</div>
              <h3>Space Shooter</h3>
              <p className="story">
                A polished, browser-based 2D space shooter built entirely on the HTML5 canvas — mouse aiming,
                click-to-shoot, asteroid spawning, and full collision detection running smoothly inside a React +
                Vite dashboard, no crash overlays in dev or production.
              </p>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/spaceshooter.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">In dashboard · Space Shooter</div>
            </div>
          </article>
        </div>
      </section>

      <section className="anatomy">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>The anatomy of a memorable game.</h2>
            <p>Four things have to be true. We engineer all four into everything we ship.</p>
          </div>
          <div className="pillars rv">
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={1.6}>
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                  <circle cx="12" cy="12" r="3.4" />
                </svg>
              </div>
              <h3>Spectacle</h3>
              <p>Scale that stops traffic — curved LED walls, physical installs, light and sound that make the brand impossible to walk past.</p>
            </div>
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth={1.6}>
                  <path d="M8 12.5l2.6 2.6L16.5 9" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <h3>Participation</h3>
              <p>Guests don't watch — they play, compete, create. Skin in the game is what turns a passerby into a protagonist.</p>
            </div>
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth={1.6}>
                  <circle cx="12" cy="8.5" r="3.5" />
                  <path d="M5 20c1.2-3.4 3.9-5 7-5s5.8 1.6 7 5" />
                </svg>
              </div>
              <h3>Personalization</h3>
              <p>AI puts each guest inside the story — their face, their drawing, their name on the board. Generic doesn't get shared.</p>
            </div>
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth={1.6}>
                  <path d="M4 19V9M10 19V5M16 19v-8M22 19H2" />
                </svg>
              </div>
              <h3>Proof</h3>
              <p>Dwell time, plays, opt-ins, qualified leads — every experience reports back, so the memory shows up in the pipeline too.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="demos" id="demos">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Don't take our word for it.</h2>
            <p>Two live, deployed games. Open them on your phone right now.</p>
          </div>
          <div className="demo-row rv">
            <a className="demo" style={{ "--tint": "rgba(253,54,41,.22)" } as React.CSSProperties} href="https://appviewx6.requisor.io/" target="_blank" rel="noopener">
              <span className="live"><i></i>Live now</span>
              <h3>AppViewX Basketball</h3>
              <p>The booth game, in the wild — built for a cybersecurity brand, live for 47 straight days.</p>
              <span className="open">Open the experience →</span>
            </a>
            <a className="demo" style={{ "--tint": "rgba(23,207,161,.22)" } as React.CSSProperties} href="https://90sspacewar.requisor.io/" target="_blank" rel="noopener">
              <span className="live"><i></i>Live now</span>
              <h3>Retro Space Shooter</h3>
              <p>Retro arcade shooting, controlled entirely by hand gesture — no touchscreen required.</p>
              <span className="open">Open the experience →</span>
            </a>
          </div>
        </div>
      </section>

      <section className="craft">
        <div className="wrap">
          <div className="sec-head rv" style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: "clamp(20px,2.6vw,28px)" }}>Built for the realities of a show floor.</h2>
          </div>
          <div className="craft-list rv">
            {[
              "Basketball", "Soccer", "Cyber Runner", "Lazer Shooter", "Retro Space Shooter", "Space Shooter",
              "Gamification", "Curved LED walls", "65\"–85\" touchscreens", "iPad kiosks", "AR triggers",
              "Real-time AI video", "Live leaderboards", "Lead capture & analytics", "Weeks, not quarters",
            ].map((chip) => (
              <span className="chip" key={chip}>{chip}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="partners">
        <div className="wrap">
          <div className="split rv">
            <div className="side">
              <h3>For exhibit houses &amp; agencies</h3>
              <p>White-label Immerse into your pitch. You own the client, the booth, and the hardware — we're the game engine behind your proposal, from concept boards to opening day.</p>
            </div>
            <div className="side">
              <h3>For brands going direct</h3>
              <p>One partner from idea to show floor. Bring us the audience and the moment you want them to remember — we'll design the game around it and put a number on it in days.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="final" id="start">
        <div className="wrap">
          <h2 className="rv">Give them something to remember.</h2>
          <p className="rv">Tell us the event, the audience, and the game you want people to keep talking about. Concept and pricing back within days.</p>
          <a className="btn rv" href="https://requisor.io" target="_blank" rel="noopener">Start a project</a>
        </div>
      </section>

      <section className="suggest" id="suggest">
        <div className="wrap">
          <div className="suggest-box rv">
            <h2>Got a game idea?</h2>
            <p>Tell us the game you wish existed at your next booth. The best ones get built — we'll follow up by email.</p>
            <form className="sform" onSubmit={submitIdea}>
              <div className="row2f">
                <div>
                  <label htmlFor="idea-name">Name</label>
                  <input ref={nameRef} id="idea-name" name="name" type="text" placeholder="Your name (optional)" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="idea-email">Email</label>
                  <input ref={emailRef} id="idea-email" name="email" type="email" placeholder="So we can follow up" autoComplete="email" />
                </div>
              </div>
              <div>
                <label htmlFor="idea-text">Your game idea</label>
                <textarea ref={ideaRef} id="idea-text" name="idea" placeholder="e.g. a VR-style dodgeball game with a live leaderboard for expo floors..." required></textarea>
              </div>
              <button type="submit" className="sbtn">Send idea →</button>
              <div className={"snote" + (note.ok ? " ok" : "")} role="status" aria-live="polite">{note.text}</div>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>Immerse is a RequisorAI product · Milwaukee, WI</span>
          <a href="https://requisor.io" target="_blank" rel="noopener">requisor.io</a>
        </div>
      </footer>
    </div>
  );
}
