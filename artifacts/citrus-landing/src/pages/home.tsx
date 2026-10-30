import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Footer } from "@/components/Footer";
import "./landing.css";

// Transcribed from a static design mockup ("Immerse by RequisorAI"). Markup
// and behavior are preserved as closely as JSX allows; see landing.css for
// how the original <style> block was scoped under the '.lp' wrapper below so
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
// so the preference — and the 'dark' class it drives on <html> for those
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
    const subject = "New activation idea for Active8";
    const bodyLines = [idea, "", "—", name ? "From: " + name : null, email ? "Reply to: " + email : null].filter(
      Boolean,
    );
    const mailto =
      "mailto:support@requisor.io?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyLines.join("\n"));
    window.location.href = mailto;
    setNote({ text: "Opening your email client — send it through and we’ll be in touch.", ok: true });
  }

  // Showcase video: plays itself (muted, looping) while it is on screen and
  // pauses off screen; the frame animates in the first time it is revealed.
  const showcaseFrameRef = useRef<HTMLDivElement>(null);
  const showcaseVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const frame = showcaseFrameRef.current;
    const video = showcaseVideoRef.current;
    if (!frame || !video) return;
    if (typeof IntersectionObserver === "undefined") {
      frame.classList.add("is-in");
      void video.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            frame.classList.add("is-in");
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, []);

  return (
    <>
    <div className="lp" ref={rootRef} data-theme={theme === "light" ? "light" : undefined} id="top">
      <nav>
        <div className="nav-in">
          <a className="mark" href="#top">
            Active8 <i></i> <small>by RequisorAI — experiential games &amp; brand activations</small>
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
            <Link className="btn" href="/games">
              Try Active8
            </Link>
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
              <i></i>Turnkey · Branded · Measurable
            </div>
            <h1 className="rise d2">
              Activate memorable <span className="lit">experiences instantly.</span>
            </h1>
            <p className="rise d3">
              Turnkey, branded interactive experiences deployed in real time, built to <b>boost engagement and
              capture leads.</b>
            </p>
            
            <div className="row rise d4">
              <Link className="btn" href="/games">Try Active8</Link>
              <a className="btn line" href="#work">See the games</a>
              <a className="btn line" href="#pricing">Pilot Program</a>
            </div>
          </div>
          <div className="hero-booth rise d3" aria-hidden="true">
            <div className="dev dev-tv">
              <div className="screen">
                <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                  <source src="/logo/basketball.mp4#t=0.1" type="video/mp4" />
                </video>
                <span className="tag2">Basketball</span>
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
            <span>Pick</span> <span>a</span> <span>game.</span> <span>Brand</span> <span>it.</span>{" "}
            <span className="hot">Go</span> <span className="hot">live.</span>
          </p>
          <div className="foot rv">
            Custom interactive experiences used to mean long timelines and bloated budgets. Active8 skips both.
            Attendees get something worth stopping for, and you get the lead data and engagement metrics to prove it
            worked — at a fraction of the cost of a custom build.
          </div>
        </div>
      </section>

      <section className="showcase" id="showcase">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>See Active8 in action.</h2>
            <p>A short look at how a ready-made game becomes your branded event experience.</p>
          </div>
          <div className="showcase-frame" ref={showcaseFrameRef}>
            <video
              ref={showcaseVideoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster="/logo/showcase-poster.jpg"
              aria-label="Active8 product overview video"
            >
              <source src="/logo/showcase.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section className="pilot" id="pricing">
        <div className="wrap">
          <div className="rv">
            <span className="pilot-badge"><i aria-hidden="true" />Limited pilot program</span>
            <h2>
              Limited pilot pricing,
              <br />
              <span className="pilot-grad">starting at $2,500.</span>
            </h2>
            <p className="pilot-lead">
              A limited-time pilot lets you bring Activate to your next event at a fraction of our standard price — fully turnkey,
              fully supported, and built to prove out the engagement before you scale.
            </p>
          </div>

          <div className="pilot-hero rv">
            <div>
              <span className="pilot-hero-eyebrow">Introducing limited pilot pricing</span>
              <p className="pilot-amount">Starting at $2,500</p>
              <p className="pilot-per">Per activation · turnkey hardware and live support included</p>
            </div>
            <a className="pilot-cta" href="mailto:support@requisor.io?subject=Activate%20pilot%20program">Activate now →</a>
          </div>

          <h3 className="pilot-subhead rv">What the pilot includes</h3>
          <div className="pilot-grid rv">
            {[
              ["blue", "Elevate your brand", "Engaging interactives that put your brand front and center at every event."],
              ["purple", "Cost effective & scalable", "Pilot pricing makes it easy to start small and scale up once you see the results."],
              ["pink", "Real-time branding", "Your branding applied live across multiple elements throughout the interactive."],
              ["orange", "Leaderboard-driven engagement", "Competitive leaderboards keep attendees playing and pull a crowd to your booth."],
              ["blue", "Integrated lead capture", "Built-in registration and data analytics turn every play into a usable lead."],
              ["purple", "Risk-free, fully supported", "Live remote tech support throughout your event, so you’re never on your own."],
              ["pink", "Turnkey hardware available", "Bundled iPads or larger touchscreens are available."],
              ["orange", "Room to go bigger", "More customized elements and LED wall integrations available as you scale."],
            ].map(([tone, title, text]) => (
              <article className="pilot-card" key={title}>
                <i className={`pilot-dot ${tone}`} aria-hidden="true" />
                <div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="pilot-banner rv">
            <strong>Pilot pricing is limited — reserve your activation.</strong>
            <a href="https://activate.requisor.io" target="_blank" rel="noopener noreferrer">activate.requisor.io →</a>
          </div>
        </div>
      </section>

      <section className="work" id="work">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Pick the experience that fits your audience.</h2>
            <p>
              Start with a proven game, then apply your logos, colors, messaging, and branded elements. Go live
              quickly without taking on a full custom-development schedule.
            </p>
          </div>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FD3629" }}></i>Gesture sports · Trade shows</div>
              <h3>Basketball Game</h3>
              <p className="story">
                Fast, gesture-controlled hoops that attendees keep coming back to beat their score. A floor-visible
                leaderboard drives repeat plays, every player registers so you capture the lead, and play metrics
                show your results.
              </p>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/basketball.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Basketball Game</div>
            </div>
          </article>

          <article className="xp rv upcoming-card">
            <div>
              <div className="cat">
                <i style={{ background: "#4AA7BD" }}></i>
                Active8 · Trivia activation
                <span className="coming-tag">Customize now</span>
              </div>
              <h3>Jeopardy</h3>
              <p className="story">
                A branded trivia board for teams, with themed categories and fast audience participation. It turns
                product knowledge into a live leaderboard moment, captures team leads up front, and shows you which
                topics resonate.
              </p>
              <Link className="btn p" href="/customize/jeopardy">Customize Jeopardy</Link>
            </div>
            <div className="visual" data-tilt="">
              <img src="/logo/jeopardy.png" alt="Jeopardy branded activation preview" loading="lazy" />
              <div className="glass"></div>
              <div className="plate">Jeopardy · Playable branding preview</div>
            </div>
          </article>

          <article className="xp rv upcoming-card">
            <div>
              <div className="cat">
                <i style={{ background: "#EC4899" }}></i>
                Active8 · Memory game
                <span className="coming-tag">Customize now</span>
              </div>
              <h3>Memory</h3>
              <p className="story">
                Players flip cards to match six brand features, racing the clock.
                The fastest time tops the leaderboard, and every player is captured as a lead.
              </p>
              <Link className="btn p" href="/customize/a8-recall">Customize Memory</Link>
            </div>
            <div className="visual" data-tilt="">
              <video
                className="gvid"
                preload="metadata"
                autoPlay
                loop
                muted
                playsInline
                poster="/recordings/recall-poster.jpg"
                style={{ objectFit: "contain", background: "#0b0f1a" }}
                aria-label="Memory gameplay preview"
              >
                <source src="/recordings/recall.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Memory · Playable branding preview</div>
            </div>
          </article>

          <div className="coming-divider rv" role="separator" aria-label="More experiences">
            <span className="coming-divider-line"></span>
            <span className="coming-divider-label">
              <i></i>
              More Experiences
              <i></i>
            </span>
            <span className="coming-divider-line end"></span>
            <span className="coming-divider-copy">Playable previews and upcoming branded activations</span>
          </div>

          <article className="xp rv upcoming-card">
            <div>
              <div className="cat">
                <i style={{ background: "#C8102E" }}></i>
                Active8 · Quiz activation
                <span className="coming-tag">Customize now</span>
              </div>
              <h3>Energy Quiz</h3>
              <p className="story">
                A five-question quiz that matches each visitor's energy and lifestyle to a personal result. It keeps
                the line moving, makes every answer feel tailored, and captures leads along with the result they
                care about.
              </p>
              <Link className="btn p" href="/customize/lexus-energy-quiz">Customize Energy Quiz</Link>
            </div>
            <div className="visual" data-tilt="">
              <video
                className="gvid"
                preload="metadata"
                autoPlay
                loop
                muted
                playsInline
                aria-label="Energy Quiz gameplay preview"
              >
                <source src="/logo/energy.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Energy Quiz · Playable branding preview</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FEC553" }}></i>Endless runner</div>
              <h3>Cyber Runner</h3>
              <p className="story">
                A cyber-themed endless runner: dodge phishing attacks, block malware, stay ahead of the breach. It
                turns your product story into gameplay, captures a lead on every run, and gives you engagement data
                on how visitors play.
              </p>
              <div className="links"><a className="go" href="https://cybersecurity.requisor.io/" target="_blank" rel="noopener">Play the demo →</a></div>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/cyber.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Cyber Runner</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat"><i style={{ background: "#FEC553" }}></i>Gesture sports · Reused engine</div>
              <h3>Soccer Game</h3>
              <p className="story">
                The same proven engine as our basketball game, reskinned as a fast-paced soccer match. Get a second
                format for a broader audience, with the same lead capture and metrics, delivered quickly.
              </p>
            </div>
            <div className="visual" data-tilt="">
              <video className="gvid" preload="auto" autoPlay loop muted playsInline>
                <source src="/logo/soccer1.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Soccer Game</div>
            </div>
          </article>

          <article className="xp rv">
            <div>
              <div className="cat">
                <i style={{ background: "#D6B15A" }}></i>
                Active8 · Golf challenge
                <span className="coming-tag">Coming soon</span>
              </div>
              <h3>Golf Challenge</h3>
              <p className="story">
                Integrate your brand into the game itself. A premium timed putting challenge that's quick to learn
                and competitive from the first shot. A live score race keeps spectators watching, which gives your
                team more time to talk, while registration captures leads and score data tracks participation.
              </p>
            </div>
            <div className="visual" data-tilt="">
              <video
                className="gvid"
                preload="metadata"
                autoPlay
                loop
                muted
                playsInline
                aria-label="Golf Challenge gameplay preview"
              >
                <source src="/logo/golf.mp4#t=0.1" type="video/mp4" />
              </video>
              <div className="glass"></div>
              <div className="plate">Coming soon · Golf Challenge</div>
            </div>
          </article>
        </div>
      </section>

      <section className="suggest" id="suggest">
        <div className="wrap">
          <div className="suggest-box rv">
            <h2>Tell us what games and interactives you’d like us to build or modify for you.</h2>
            <p>
              Share the game or interactive experience you want to bring to an event, booth, or campaign. We’ll
              follow up by email to explore the idea with you.
            </p>
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
                <label htmlFor="idea-text">Your game or interactive idea</label>
                <textarea ref={ideaRef} id="idea-text" name="idea" placeholder="e.g. a branded team challenge with a live leaderboard for an expo floor..." required></textarea>
              </div>
              <button type="submit" className="sbtn">Share your idea →</button>
              <div className={"snote" + (note.ok ? " ok" : "")} role="status" aria-live="polite">{note.text}</div>
            </form>
          </div>
        </div>
      </section>

      <section className="anatomy">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Built to move at event speed.</h2>
            <p>Launch a custom-feeling experience quickly, capture every interaction, and leave the show with results.</p>
          </div>
          <div className="pillars rv">
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={1.6}>
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                  <circle cx="12" cy="12" r="3.4" />
                </svg>
              </div>
              <h3>Live fast.</h3>
              <p>Games are already built. Branding and deployment happen in real time, not over a production schedule.</p>
            </div>
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth={1.6}>
                  <path d="M8 12.5l2.6 2.6L16.5 9" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <h3>Spend less.</h3>
              <p>A custom-feeling experience without the custom-build price tag.</p>
            </div>
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth={1.6}>
                  <circle cx="12" cy="8.5" r="3.5" />
                  <path d="M5 20c1.2-3.4 3.9-5 7-5s5.8 1.6 7 5" />
                </svg>
              </div>
              <h3>Prove it.</h3>
              <p>Every play captures lead data and interaction metrics, so you walk out of the show with results, not just foot traffic.</p>
            </div>
            <div className="pillar">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth={1.6}>
                  <path d="M4 19V9M10 19V5M16 19v-8M22 19H2" />
                </svg>
              </div>
              <h3>Customize it.</h3>
              <p>Build upon the platform. Add branded elements directly into gameplay, reskin the entire UI, or modify the interactive experience.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="partners">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Who it’s for.</h2>
            <p>Active8 gives agencies and brands a faster way to put meaningful interactivity at the center of an event.</p>
          </div>
          <div className="split audience-grid rv">
            <div className="side">
              <h3>Exhibit &amp; Experiential Agencies</h3>
              <p>
                Give your clients an interactive centerpiece without adding a dev project to your build schedule.
                Active8 drops into your booth designs, deploys on your timeline, and makes you look like the team
                that thought of everything. Add interactivity to any proposal without adding risk or overhead.
              </p>
            </div>
            <div className="side">
              <h3>Marketing Agencies</h3>
              <p>
                Stop telling clients an interactive activation is out of budget. Active8 lets you pitch, brand, and
                launch engaging experiences quickly, with lead capture and reporting built in, so you can show
                clients real numbers after the event.
              </p>
            </div>
            <div className="side">
              <h3>Brands</h3>
              <p>
                Your booth competes with hundreds of others. Active8 gives attendees a reason to walk up, experience
                your brand in an interactive way, and share their details willingly. Your team gets qualified leads
                and clear engagement data without waiting on long development cycles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="craft">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>How it works.</h2>
            <p>From choosing a game to measuring the results, Active8 keeps every step direct and fast.</p>
          </div>
          <ol className="process-list rv">
            {[
              ["Choose your game.", "Browse the library and pick the experience that fits your event and audience."],
              ["Brand it.", "Your logos, colors, and messaging go in, so it feels built for you."],
              ["Pitch it.", "Record the live gameplay with branding applied and close more business."],
              ["Activate.", "Go live in real time and start engaging attendees immediately."],
              ["Capture and measure.", "Collect lead data and track interaction metrics as people play."],
            ].map(([title, description], index) => (
              <li className="process-step" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="demos" id="demos">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Why Active8.</h2>
            <p>No long lead times, no generic branding, and no guessing whether the experience worked.</p>
          </div>
          <div className="why-grid rv">
            {[
              ["Turnkey.", "No custom development, no long lead times, no surprises."],
              ["Branded.", "Every experience carries your identity, not ours."],
              ["Lead-focused.", "Player registration and data capture are part of the game flow, not an afterthought."],
              ["Measurable.", "Interaction metrics show what worked so you can justify the spend and improve the next event."],
              ["Affordable.", "Custom-feeling results at a fraction of custom-build pricing."],
            ].map(([title, description]) => (
              <div className="why-card" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="analytics" id="analytics">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>See exactly who played, when, and how.</h2>
            <p>Every game you deploy comes with a live dashboard. Watch engagement build in real time and leave the event with data, not guesses.</p>
          </div>
          <div className="analytics-feature rv">
            <figure className="analytics-visual">
              <img
                src="/images/analytics-preview.svg"
                alt="Illustrative dashboard image with sample participation trend, peak times, and activity by event day; not live customer data"
                loading="lazy"
              />
              <figcaption>Illustrative dashboard preview · Sample data, not live customer results</figcaption>
            </figure>
            <div className="analytics-copy">
              <span className="pricing-eyebrow">What you see</span>
              <ul>
                <li><strong>Total users and top scores.</strong> Know how many people played and who's winning, at a glance.</li>
                <li><strong>Peak times.</strong> See when traffic spikes so you can staff the booth when it matters.</li>
                <li><strong>Attendee roles.</strong> Find out whether you're reaching VPs, technologists, or students.</li>
                <li><strong>Companies.</strong> See which organizations stopped by, so your team knows who to follow up with first.</li>
                <li><strong>Daily activity.</strong> Compare engagement across event days.</li>
                <li><strong>Gameplay performance.</strong> Track shots made, shots taken, and scores by player to see how the game is being played.</li>
              </ul>
            </div>
          </div>
          <div className="analytics-outcome rv">
            <h3>Built for the people who need to prove it worked.</h3>
            <p>Walk out of the show with a qualified lead list and the numbers to justify the spend. Show real engagement data, not just photos of a busy booth. Data also drives game optimization for future deployments.</p>
            <p>Included with every subscription. Real-time dashboards cover all your deployed games in one place.</p>
          </div>
        </div>
      </section>

      <section className="final" id="start">
        <div className="wrap">
          <h2 className="rv">Ready to activate?</h2>
          <p className="rv">
            Choose a game, apply your brand, and launch an experience that captures attention, leads, and measurable
            engagement.
          </p>
          <Link className="btn rv" href="/games">Try Active8</Link>
        </div>
      </section>

    </div>
    <Footer />
    </>
  );
}
