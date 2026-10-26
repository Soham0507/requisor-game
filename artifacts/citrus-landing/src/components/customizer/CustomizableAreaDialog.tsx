import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlignLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ListChecks,
  MousePointerClick,
  Palette,
  PanelTop,
  RotateCcw,
  Type,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { Game } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PREVIEW_BASE_PATHS } from "@/lib/preview-paths";
import { GamePreviewFrame, type BrandThemeMessage } from "./GamePreviewFrame";
import { customizableAreas } from "./customizableAreas";

// Long enough for the previous outline's diff window to close before the next sample is applied.
const SETTLE_MS = 700;
// Let the game finish loading before the first area is shown on its own.
const AUTOSTART_MS = 2200;

const AREA_ICONS: Record<string, LucideIcon> = {
  logo: ImageIcon,
  heading: Type,
  tagline: AlignLeft,
  primary: Palette,
  secondary: Palette,
  accent: Palette,
  navbar: PanelTop,
  background: ImageIcon,
  product: ImageIcon,
  font: Upload,
  questions: ListChecks,
};

function baseTheme(game: Game): BrandThemeMessage {
  return {
    primaryColor: game.defaultPrimaryColor,
    secondaryColor: game.defaultSecondaryColor,
    accentColor: game.defaultAccentColor,
    logoUrl: game.defaultLogoUrl ?? null,
    logoSize: 56,
    brandName: "",
    brandNameSize: 16,
    brandNameColor: "#ffffff",
    heading: game.defaultHeading,
    headingSize: game.slug === "jeopardy" ? 48 : 28,
    headingColor: game.slug === "jeopardy" ? "#00384f" : "#ffffff",
    tagline: "",
    bgUrl: null,
    fontUrl: null,
    // Explicit null (not absent) so a sample navbar color is cleared on reset.
    navbarColor: null,
    gameContent: null,
  };
}

interface Props {
  game: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Shows the game and, one area at a time, outlines the parts a customer can change. */
export function CustomizableAreaDialog({ game, open, onOpenChange }: Props) {
  const base = useMemo(() => baseTheme(game), [game]);
  const areas = useMemo(() => customizableAreas(game.slug), [game.slug]);
  const previewPath = PREVIEW_BASE_PATHS[game.slug];
  const demoAreas = useMemo(() => areas.filter((a) => a.demo), [areas]);
  const otherAreas = useMemo(() => areas.filter((a) => !a.demo), [areas]);
  const [theme, setTheme] = useState(base);
  const [quiet, setQuiet] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const timer = useRef(0);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active;

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) {
      window.clearTimeout(timer.current);
      setTheme(base);
      setQuiet(false);
      setActive(null);
    }
  }, [open, base]);

  const show = (id: string) => {
    const area = areas.find((a) => a.id === id);
    if (!area?.demo) return;
    window.clearTimeout(timer.current);
    setActive(id);
    // Back to the default silently first, so only this area gets outlined.
    setQuiet(true);
    setTheme(base);
    timer.current = window.setTimeout(() => {
      setQuiet(false);
      setTheme(area.demo!(base));
    }, SETTLE_MS);
  };

  // Start the tour by itself, so a first-time visitor sees an outline right away.
  useEffect(() => {
    if (!open || !previewPath || !demoAreas.length) return;
    const start = window.setTimeout(() => {
      if (!activeRef.current) show(demoAreas[0].id);
    }, AUTOSTART_MS);
    return () => window.clearTimeout(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, previewPath, demoAreas]);

  const reset = () => {
    window.clearTimeout(timer.current);
    setActive(null);
    setQuiet(true);
    setTheme(base);
  };

  const activeIndex = demoAreas.findIndex((a) => a.id === active);
  const activeArea = activeIndex >= 0 ? demoAreas[activeIndex] : null;
  const step = (delta: number) => {
    const next = demoAreas[(Math.max(activeIndex, 0) + delta + demoAreas.length) % demoAreas.length];
    if (next) show(next.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[92vh] gap-0 overflow-y-auto p-0"
        data-testid={`dialog-customizable-${game.slug}`}
      >
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Customizable areas</p>
          <DialogTitle className="text-2xl">{game.name}</DialogTitle>
          <DialogDescription>
            Pick an item to see exactly where it appears in the game. Each one can be changed in the customizer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-3">
            {previewPath ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[11px] font-medium text-muted-foreground">Live preview</span>
                </div>
                <GamePreviewFrame previewBasePath={previewPath} theme={theme} exploreMode quiet={quiet} />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                A live preview is not available for this game yet.
              </div>
            )}

            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                {activeArea ? (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {activeArea.label}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {activeIndex + 1} of {demoAreas.length}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activeArea.description}</p>
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MousePointerClick size={16} className="shrink-0 text-primary" />
                    Choose an item on the right to highlight it in the game.
                  </p>
                )}
              </div>
              {demoAreas.length > 1 && previewPath && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => step(-1)} aria-label="Previous area">
                    <ChevronLeft size={16} />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => step(1)} aria-label="Next area">
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">See it in the game</p>
              <div className="flex flex-col gap-1.5">
                {demoAreas.map((area, i) => {
                  const Icon = AREA_ICONS[area.id] ?? Palette;
                  const isActive = active === area.id;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      disabled={!previewPath}
                      onClick={() => show(area.id)}
                      aria-pressed={isActive}
                      data-testid={`area-${area.id}`}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{area.label}</span>
                        {isActive && <span className="block text-xs text-muted-foreground">{area.description}</span>}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {otherAreas.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Also customizable</p>
                <ul className="flex flex-col gap-1.5">
                  {otherAreas.map((area) => {
                    const Icon = AREA_ICONS[area.id] ?? Upload;
                    return (
                      <li
                        key={area.id}
                        data-testid={`area-${area.id}`}
                        className="flex items-start gap-3 rounded-xl border border-dashed border-border px-3 py-2.5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{area.label}</span>
                          <span className="block text-xs text-muted-foreground">{area.description}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-1">
              <Link href={`/customize/${game.slug}`}>
                <Button type="button" className="w-full gap-2" data-testid={`button-dialog-customize-${game.slug}`}>
                  Customize this game <ArrowRight size={16} />
                </Button>
              </Link>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={reset} disabled={!previewPath}>
                <RotateCcw size={14} /> Reset preview
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
