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
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid="button-toggle-filters"
          className={`shrink-0 inline-flex items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
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
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {FACETS.map((facet) => (
            <div key={facet.id}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{facet.label}</p>
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
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
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
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground min-h-5">
        <span data-testid="text-result-count">
          {isFiltered ? `${resultCount} of ${totalCount} games` : `${totalCount} games`}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={onClear}
            className="hover:text-foreground underline underline-offset-2"
            data-testid="button-clear-search"
          >
            Clear search & filters
          </button>
        )}
      </div>
    </div>
  );
}
