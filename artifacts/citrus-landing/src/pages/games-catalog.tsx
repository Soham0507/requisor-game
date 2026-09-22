import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { useListGames } from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOBILE_UNSUPPORTED, MOBILE_UNSUPPORTED_MESSAGE } from "@/lib/mobile-support";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// Reuses the same demo footage already shown per-project in the "Our Work"
// section on the home page (see Cyber.tsx's `projects` list), so visitors
// recognize the game before they click Customize. A game with no entry here
// just skips the preview clip on its card.
const GAME_PREVIEWS: Record<string, { type: "video" | "image"; src: string }> = {
  "space-shooter-1": { type: "video", src: "/logo/spaceshooter.mp4" },
  "cyber-adventure": { type: "video", src: "/logo/cyber.mp4" },
  "basketball-shootout": { type: "video", src: "/logo/app1.mp4" },
  "gesture-space-war": { type: "video", src: "/logo/90.mp4" },
};

export default function GamesCatalog() {
  const { data: games, isLoading, isError } = useListGames();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-6 md:px-12 pt-32 pb-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Pick a game to brand
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choose a game, customize its logo, colors, and heading, try it live, then finalize your branding.
          </p>
        </div>

        {isLoading && <p className="text-center text-muted-foreground">Loading catalog…</p>}
        {isError && <p className="text-center text-destructive">Couldn't load the game catalog. Please try again.</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {games?.map((game) => {
            const preview = GAME_PREVIEWS[game.slug];
            return (
              <Card key={game.id} className="flex flex-col bg-card border-border overflow-hidden">
                {preview && (
                  <div className="relative h-40 -mx-px -mt-px overflow-hidden">
                    {preview.type === "image" ? (
                      <img src={preview.src} className="w-full h-full object-cover" alt={`${game.name} preview`} />
                    ) : (
                      <video src={preview.src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-foreground">{game.name}</h3>
                    {game.brandSupport === "full" ? (
                      <Badge className="bg-primary/20 text-primary border-primary/40">Live re-skin</Badge>
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
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-foreground">{formatPrice(game.priceCents)}</span>
                    {game.brandSupport === "full" ? (
                      <Link href={`/customize/${game.slug}`}>
                        <Button data-testid={`button-customize-${game.slug}`}>Customize</Button>
                      </Link>
                    ) : (
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
