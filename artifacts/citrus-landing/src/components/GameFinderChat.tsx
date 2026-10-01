import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  MessageCircle,
  X,
  RotateCcw,
  Sparkles,
  Bot,
  Zap,
  PersonStanding,
  HelpCircle,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Rocket,
  CircleDot,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useListGames } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

// A guided (not AI) "which game fits my booth" quiz: a couple quick-reply
// questions, max, down to one of the games in the catalog. Deterministic
// and free to run — no LLM call, no API key — so it floats on every page
// (mounted once in App.tsx) without any backend cost.
type QuestionId = "q1" | "skill-theme" | "gesture-theme";
type Next = QuestionId | { result: string };

interface QuestionOption {
  label: string;
  icon: LucideIcon;
  next: Next;
}

const QUESTIONS: Record<QuestionId, { prompt: string; options: QuestionOption[] }> = {
  q1: {
    prompt: "What are you setting up?",
    options: [
      { label: "A fast-paced skill game", icon: Zap, next: "skill-theme" },
      { label: "A movement / gesture activity", icon: PersonStanding, next: "gesture-theme" },
      { label: "A quick quiz for booth visitors", icon: HelpCircle, next: { result: "lexus-energy-quiz" } },
      { label: "A fun photo/video keepsake", icon: Camera, next: { result: "boat-booth" } },
      { label: "Security awareness training / education", icon: ShieldCheck, next: { result: "cyber-adventure" } },
    ],
  },
  "skill-theme": {
    prompt: "Pick a theme",
    options: [
      { label: "Space combat", icon: Rocket, next: { result: "space-shooter-1" } },
      { label: "Cybersecurity — dodge obstacles", icon: ShieldAlert, next: { result: "cyber-adventure" } },
    ],
  },
  "gesture-theme": {
    prompt: "Pick a theme",
    options: [
      { label: "Sports — basketball", icon: CircleDot, next: { result: "basketball-shootout" } },
      { label: "Space combat — gesture controlled", icon: Rocket, next: { result: "gesture-space-war" } },
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
    <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-pink-500 grid place-items-center shadow-sm">
      <Bot size={14} className="text-primary-foreground" />
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <BotAvatar />
      <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground max-w-[85%]">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2.5 text-sm max-w-[85%]">
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
      className="group w-full flex items-center gap-2.5 rounded-full border border-border bg-background pl-3 pr-2.5 py-2 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="shrink-0 w-6 h-6 rounded-full bg-muted grid place-items-center text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-colors">
        <Icon size={13} />
      </span>
      <span className="flex-grow text-left">{children}</span>
      <ChevronRight
        size={15}
        className="shrink-0 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
      />
    </button>
  );
}

function GameRecommendation({ slug }: { slug: string }) {
  const { data: games, isLoading } = useListGames();
  const game = games?.find((g) => g.slug === slug);

  return (
    <div className="flex items-start gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <BotAvatar />
      <div className="rounded-2xl rounded-tl-sm border border-primary/30 bg-gradient-to-br from-primary/10 to-pink-500/5 p-3.5 max-w-[88%] space-y-2.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles size={13} />
          Sounds like a good fit
        </p>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {game && (
          <div>
            <p className="font-semibold text-foreground">{game.name}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{game.tagline}</p>
            <div className="mt-3">
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
        <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-2xl shadow-black/20 overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-pink-500/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-pink-500 grid place-items-center">
                <Sparkles size={15} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">Game Finder</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Usually replies instantly</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-7 h-7 rounded-full grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="button-chat-close"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="p-4 space-y-3 overflow-y-auto">
            <BotBubble>Answer a couple questions and I'll point you at the game that fits your booth.</BotBubble>

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
              <div className="space-y-1.5 pl-9">
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pl-9"
                data-testid="button-chat-restart"
              >
                <RotateCcw size={12} />
                Start over
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close game finder" : "Open game finder"}
        className="w-14 h-14 rounded-full grid place-items-center bg-gradient-to-br from-primary to-pink-500 text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
        data-testid="button-chat-toggle"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
