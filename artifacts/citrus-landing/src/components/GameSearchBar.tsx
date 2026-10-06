import { useState, type Dispatch, type SetStateAction } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FACETS,
  activeFilterCount,
  facetLabel,
  type FacetId,
  type Filters,
} from "@/lib/game-search";

interface GameSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: Filters;
  onFiltersChange: Dispatch<SetStateAction<Filters>>;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

export function GameSearchBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  onClear,
  resultCount,
  totalCount,
}: GameSearchBarProps) {
  const [open, setOpen] = useState(false);
  const activeCount = activeFilterCount(filters);
  const isFiltered = activeCount > 0 || query.trim() !== "";

  const toggle = (facet: FacetId, value: string) => {
    onFiltersChange((prev) => ({
      ...prev,
      [facet]: prev[facet].includes(value) ? prev[facet].filter((v) => v !== value) : [...prev[facet], value],
    }));
  };

  return (
    <div className="max-w-3xl mx-auto mb-8 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            maxLength={200}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search games — try “trivia leaderboard”, “prize wheel”, “touchless”…"
            className="pl-9 pr-9"
            aria-label="Search games"
            data-testid="input-game-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="game-search-filters"
          data-testid="button-toggle-filters"
          className={`shrink-0 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            open || activeCount > 0
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div id="game-search-filters" className="rounded-xl border border-border bg-card p-4 space-y-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200">
          {FACETS.map((facet) => (
            <fieldset key={facet.id}>
              <legend className="text-xs font-medium text-muted-foreground mb-2">{facet.label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {facet.values.map((value) => {
                  const on = filters[facet.id].includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggle(facet.id, value)}
                      aria-pressed={on}
                      data-testid={`chip-${facet.id}-${value}`}
                      className={`rounded-full border min-h-9 px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {facetLabel(value)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground min-h-5">
        <span role="status" aria-live="polite" data-testid="text-result-count">
          {isFiltered ? `${resultCount} of ${totalCount} games` : `${totalCount} games`}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-9 hover:text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="button-clear-search"
          >
            Clear search & filters
          </button>
        )}
      </div>
    </div>
  );
}
