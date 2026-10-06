import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertTriangle } from "lucide-react";
import { useListGames } from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOBILE_UNSUPPORTED, MOBILE_UNSUPPORTED_MESSAGE } from "@/lib/mobile-support";
import { GameSearchBar } from "@/components/GameSearchBar";
import { EMPTY_FILTERS, FACETS, searchAndFilter, type Filters } from "@/lib/game-search";

// Reuses the same demo footage already shown per-project in the "Our Work"
// section on the home page (see Cyber.tsx's `projects` list), so visitors
// recognize the game before they click Customize. A game with no entry here
// just skips the preview clip on its card.
const GAME_PREVIEWS: Record<string, { type: "video" | "image"; src: string; poster?: string; fit?: "contain" }> = {
  "space-shooter-1": { type: "video", src: "/logo/spaceshooter.mp4" },
  "cyber-adventure": { type: "video", src: "/logo/cyber.mp4" },
  "basketball-shootout": { type: "video", src: "/logo/app1.mp4" },
  "gesture-space-war": { type: "video", src: "/logo/90.mp4" },
  "golf-challenge": {
    type: "video",
    src: "/logo/golf.mp4",
    poster: "/logo/golf-poster.jpg",
  },
  "a8-match": { type: "video", src: "/recordings/match.mp4", poster: "/recordings/match-poster.jpg", fit: "contain" },
  "a8-trivia-rush": { type: "video", src: "/recordings/rush.mp4", poster: "/recordings/rush-poster.jpg", fit: "contain" },
  "a8-the-number": { type: "video", src: "/recordings/number.mp4", poster: "/recordings/number-poster.jpg", fit: "contain" },
  "a8-spin-to-win": { type: "video", src: "/recordings/spin.mp4", poster: "/recordings/spin-poster.jpg", fit: "contain" },
  "a8-recall": { type: "video", src: "/recordings/recall.mp4", poster: "/recordings/recall-poster.jpg", fit: "contain" },
};

const QUIZ_SURVEY_GAMES = new Set([
  "a8-match", "a8-trivia-rush", "a8-the-number", "a8-spin-to-win", "a8-recall",
  "jeopardy",
]);
const VERTICALS = [
  { id: "all", label: "All experiences", href: "/games" },
  { id: "activations", label: "Games & Activations", href: "/games/activations" },
  { id: "quiz-questionnaire-survey", label: "Quiz / Questionnaire / Survey", href: "/games/quiz-questionnaire-survey" },
] as const;
type Vertical = (typeof VERTICALS)[number]["id"];

export default function GamesCatalog({ vertical = "all" }: { vertical?: Vertical }) {
  const { data: games, isLoading, isError } = useListGames();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const query = (params.get("q") ?? "").slice(0, 200);
  const filters = useMemo(() => {
    const next = { ...EMPTY_FILTERS };
    for (const facet of FACETS) {
      next[facet.id] = facet.values.filter((value) => params.getAll(facet.id).includes(value));
    }
    return next;
  }, [params]);
  const isQuizVertical = vertical === "quiz-questionnaire-survey";
  const verticalGames = useMemo(() => (games ?? []).filter((game) =>
    vertical === "all" || QUIZ_SURVEY_GAMES.has(game.slug) === isQuizVertical), [games, vertical, isQuizVertical]);
  const visibleGames = useMemo(() => searchAndFilter(verticalGames, query, filters), [verticalGames, query, filters]);

  const updateSearch = (nextQuery: string, nextFilters: Filters) => {
    const next = new URLSearchParams(search);
    if (nextQuery) next.set("q", nextQuery.slice(0, 200));
    else next.delete("q");
    for (const facet of FACETS) {
      next.delete(facet.id);
      for (const value of facet.values) {
        if (nextFilters[facet.id].includes(value)) next.append(facet.id, value);
      }
    }
    const suffix = next.toString();
    navigate(`${location}${suffix ? `?${suffix}` : ""}`, { replace: true });
  };
  const changeFilters: Dispatch<SetStateAction<Filters>> = (action) =>
    updateSearch(query, typeof action === "function" ? action(filters) : action);
  const clearSearch = () => updateSearch("", EMPTY_FILTERS);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-6 md:px-12 pt-32 pb-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {isQuizVertical ? "Quiz / Questionnaire / Survey" : "Pick a game to brand"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {isQuizVertical
              ? "Explore interactive experiences for quizzes, questionnaires, and surveys. Customize your branding and try them live."
              : "Choose a game, customize its logo, colors, and heading, try it live, then finalize your branding."}
          </p>
          {isQuizVertical && (
            <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-3">
              Our five-game collection features Apple-inspired light interfaces with SF Pro on Apple devices, iOS-style forms, switches, and sheets.
            </p>
          )}
        </div>

        <nav aria-label="Experience verticals" className="flex flex-wrap justify-center gap-3 mb-10">
          {VERTICALS.map((item) => (
            <Link
              key={item.id}
              href={`${item.href}${search ? `?${search}` : ""}`}
              aria-current={vertical === item.id ? "page" : undefined}
              className={`rounded-full border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                vertical === item.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {!isLoading && !isError && games && (
          <GameSearchBar
            query={query}
            onQueryChange={(next) => updateSearch(next, filters)}
            filters={filters}
            onFiltersChange={changeFilters}
            onClear={clearSearch}
            resultCount={visibleGames.length}
            totalCount={verticalGames.length}
          />
        )}
        {isLoading && <p className="text-center text-muted-foreground">Loading catalog…</p>}
        {isError && <p className="text-center text-destructive">Couldn't load the game catalog. Please try again.</p>}
        {!isLoading && !isError && games && visibleGames.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center mb-8" data-testid="empty-game-search">
            <h2 className="text-xl font-semibold mb-2">No matching games</h2>
            <p className="text-muted-foreground mb-4">Try another search, remove a filter, or switch to All experiences.</p>
            <Button variant="outline" onClick={clearSearch}>Clear search & filters</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {visibleGames?.map((game) => {
            const preview =
              GAME_PREVIEWS[game.slug] ??
              (game.thumbnailUrl
                ? { type: "image" as const, src: game.thumbnailUrl }
                : undefined);
            const customizationAvailable = game.brandSupport === "full" && game.slug !== "boat-booth";
            return (
              <Card key={game.id} className="flex flex-col bg-card border-border overflow-hidden">
                {preview && (
                  <div className="relative h-40 -mx-px -mt-px overflow-hidden">
                    {preview.type === "image" ? (
                      <img src={preview.src} className="w-full h-full object-cover" alt={`${game.name} preview`} />
                    ) : (
                      <video
                        src={preview.src}
                        poster={preview.poster}
                        preload="metadata"
                        autoPlay
                        loop
                        muted
                        playsInline
                        aria-label={`${game.name} gameplay preview`}
                        className={`w-full h-full ${preview.fit === "contain" ? "object-contain bg-black" : "object-cover"}`}
                      />
                    )}
                  </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                  {QUIZ_SURVEY_GAMES.has(game.slug) && (
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      Quiz / Questionnaire / Survey
                    </p>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-foreground">{game.name}</h3>
                    {customizationAvailable ? (
                      <Badge className="bg-primary/20 text-primary border-primary/40">Live re-skin</Badge>
                    ) : game.slug === "boat-booth" ? (
                      <Badge variant="secondary">Preview only</Badge>
                    ) : (
                      <Badge variant="secondary">Coming soon</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm flex-grow mb-3">{game.tagline}</p>
                  {MOBILE_UNSUPPORTED.has(game.slug) && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-2">
                      <AlertTriangle size={13} className="shrink-0" />
                      {MOBILE_UNSUPPORTED_MESSAGE}
                    </p>
                  )}
                  <div className="flex justify-end">
                    {customizationAvailable ? (
                      <Link href={`/customize/${game.slug}`}>
                        <Button data-testid={`button-customize-${game.slug}`}>Customize</Button>
                      </Link>
                    ) : game.slug === "boat-booth" ? null : (
                      <Button disabled data-testid={`button-customize-${game.slug}`}>Customize</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
