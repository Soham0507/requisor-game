import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  MessageCircle,
  Phone,
  X,
  RotateCcw,
  Sparkles,
  Bot,
  Zap,
  Store,
  GraduationCap,
  Tv,
  Monitor,
  HelpCircle,
  Camera,
  ShieldCheck,
  Rocket,
  CircleDot,
  Timer,
  Gauge,
  Gift,
  Brain,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useListGames } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

// A guided (not AI) "which game fits my booth" quiz: a couple quick-reply
// questions, max, down to one of the games in the catalog. Deterministic
// and free to run — no LLM call, no API key — so it floats on every page
// (mounted once in App.tsx) without any backend cost.
type QuestionId = "q1" | "booth" | "training" | "retail" | "online" | "quiz";
type Next = QuestionId | { result: string };

interface QuestionOption {
  label: string;
  icon: LucideIcon;
  next: Next;
}

// Event type first, then the vibe — every path is exactly two questions.
const QUESTIONS: Record<QuestionId, { prompt: string; options: QuestionOption[] }> = {
  q1: {
    prompt: "Where will it run?",
    options: [
      { label: "Trade show booth", icon: Store, next: "booth" },
      { label: "Training / classroom", icon: GraduationCap, next: "training" },
      { label: "Retail / kiosk", icon: Tv, next: "retail" },
      { label: "Online / desktop", icon: Monitor, next: "online" },
    ],
  },
  booth: {
    prompt: "What vibe?",
    options: [
      { label: "Active & competitive", icon: CircleDot, next: { result: "basketball-shootout" } },
      { label: "Immersive sci-fi", icon: Rocket, next: { result: "gesture-space-war" } },
      { label: "Quiz / lead capture", icon: HelpCircle, next: "quiz" },
    ],
  },
  training: {
    prompt: "What for?",
    options: [
      { label: "Security awareness", icon: ShieldCheck, next: { result: "cyber-adventure" } },
      { label: "Knowledge check", icon: HelpCircle, next: "quiz" },
    ],
  },
  retail: {
    prompt: "What vibe?",
    options: [
      { label: "Photo / video keepsake", icon: Camera, next: { result: "boat-booth" } },
      { label: "Quick quiz", icon: HelpCircle, next: "quiz" },
    ],
  },
  quiz: {
    prompt: "Which style?",
    options: [
      { label: "Jeopardy", icon: HelpCircle, next: { result: "jeopardy" } },
      { label: "Match visitors to a product", icon: Sparkles, next: { result: "a8-match" } },
      { label: "Fast trivia race", icon: Timer, next: { result: "a8-trivia-rush" } },
      { label: "Guess the stat", icon: Gauge, next: { result: "a8-the-number" } },
      { label: "Spin to win a prize", icon: Gift, next: { result: "a8-spin-to-win" } },
      { label: "Test brand recall", icon: Brain, next: { result: "a8-recall" } },
      { label: "Lifestyle personality quiz", icon: HelpCircle, next: { result: "lexus-energy-quiz" } },
    ],
  },
  online: {
    prompt: "What style?",
    options: [
      { label: "Arcade shooter", icon: Rocket, next: { result: "space-shooter-1" } },
      { label: "Endless runner", icon: Zap, next: { result: "cyber-adventure" } },
    ],
  },
};

type Message =
  | { type: "bot-question"; questionId: QuestionId }
  | { type: "user-answer"; label: string }
  | { type: "bot-result"; slug: string };

const INITIAL_MESSAGES: Message[] = [{ type: "bot-question", questionId: "q1" }];

function BotAvatar() {
  return (
    <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-pink-500 grid place-items-center shadow-sm">
      <Bot size={12} className="text-primary-foreground" />
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <BotAvatar />
      <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5 text-sm text-foreground max-w-[85%]">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-1.5 text-sm max-w-[85%]">
        {children}
      </div>
    </div>
  );
}

function QuickReply({ icon: Icon, onClick, children }: { icon: LucideIcon; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-2 rounded-full border border-border bg-background pl-2 pr-2.5 py-1 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="shrink-0 w-5 h-5 rounded-full bg-muted grid place-items-center text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-colors">
        <Icon size={11} />
      </span>
      <span className="flex-grow text-left">{children}</span>
      <ChevronRight
        size={14}
        className="shrink-0 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
      />
    </button>
  );
}

function GameRecommendation({ slug }: { slug: string }) {
  const { data: games, isLoading } = useListGames();
  const game = games?.find((g) => g.slug === slug);
  // The catalog is the source of truth: if it failed to load or doesn't list
  // this game (e.g. a database that hasn't been seeded with it yet), say so
  // and point at the catalog instead of rendering an empty card.
  const missing = !isLoading && !game;

  return (
    <div className="flex items-start gap-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <BotAvatar />
      <div className="rounded-2xl rounded-tl-sm border border-primary/30 bg-gradient-to-br from-primary/10 to-pink-500/5 p-3 max-w-[90%] space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles size={13} />
          Best match
        </p>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {missing && (
          <div>
            <p className="text-sm text-foreground">That game isn't available right now.</p>
            <div className="mt-2">
              <Link href="/games">
                <Button size="sm" className="rounded-full">
                  Browse all games
                  <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        )}
        {game && (
          <div>
            <p className="font-semibold text-foreground">{game.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{game.tagline}</p>
            <div className="mt-2">
              {game.brandSupport === "full" ? (
                <Link href={`/customize/${game.slug}`}>
                  <Button size="sm" className="rounded-full" data-testid="button-chat-customize">
                    Customize it
                    <ChevronRight size={14} />
                  </Button>
                </Link>
              ) : (
                <Button size="sm" className="rounded-full" disabled>
                  Coming soon
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GameFinderChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const choose = (label: string, next: Next) => {
    setMessages((prev) => [
      ...prev,
      { type: "user-answer", label },
      typeof next === "string" ? { type: "bot-question", questionId: next } : { type: "bot-result", slug: next.result },
    ]);
  };

  const restart = () => setMessages(INITIAL_MESSAGES);

  const lastMessage = messages[messages.length - 1];
  const activeQuestion = lastMessage?.type === "bot-question" ? QUESTIONS[lastMessage.questionId] : null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-2xl shadow-black/20 overflow-hidden flex flex-col h-[28rem] max-h-[75vh] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-pink-500/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-pink-500 grid place-items-center">
                <Sparkles size={13} className="text-primary-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Game Finder</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-6 h-6 rounded-full grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="button-chat-close"
            >
              <X size={14} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto">
            {messages.map((message, i) => {
              if (message.type === "bot-question") {
                const isLatest = i === messages.length - 1;
                return isLatest ? <BotBubble key={i}>{QUESTIONS[message.questionId].prompt}</BotBubble> : null;
              }
              if (message.type === "user-answer") {
                return <UserBubble key={i}>{message.label}</UserBubble>;
              }
              return <GameRecommendation key={i} slug={message.slug} />;
            })}

            {activeQuestion && (
              <div className="space-y-1 pl-8">
                {activeQuestion.options.map((option) => (
                  <QuickReply key={option.label} icon={option.icon} onClick={() => choose(option.label, option.next)}>
                    {option.label}
                  </QuickReply>
                ))}
              </div>
            )}

            {messages.length > 1 && (
              <button
                type="button"
                onClick={restart}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pl-8"
                data-testid="button-chat-restart"
              >
                <RotateCcw size={12} />
                Start over
              </button>
            )}
          </div>
          <div className="shrink-0 border-t border-border p-3">
            <a
              href="tel:+16314152581"
              aria-label="Call live support at +1 (631) 415-2581"
              data-testid="button-chat-live-support"
              className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Phone size={18} aria-hidden="true" className="shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">Live support</span>
                <span className="block text-xs text-muted-foreground">Call +1 (631) 415-2581</span>
              </span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close game finder" : "Open game finder"}
        className="w-12 h-12 rounded-full grid place-items-center bg-gradient-to-br from-primary to-pink-500 text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
        data-testid="button-chat-toggle"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
