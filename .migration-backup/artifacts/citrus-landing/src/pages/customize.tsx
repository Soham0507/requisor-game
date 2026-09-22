import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Monitor, Tablet, Smartphone, AlertTriangle } from "lucide-react";
import {
  useGetGame,
  useUpsertBrandingDraft,
  useFinalizeBrandingDraft,
  type Order,
} from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getDraftToken } from "@/lib/draft-token";
import { GamePreviewFrame, type BrandThemeMessage, type DeviceSize } from "@/components/customizer/GamePreviewFrame";
import { BrandingForm } from "@/components/customizer/BrandingForm";
import { OrderSummaryPanel } from "@/components/customizer/OrderSummaryPanel";
import { ContactCustomUiDialog } from "@/components/customizer/ContactCustomUiDialog";
import { MOBILE_UNSUPPORTED, MOBILE_UNSUPPORTED_MESSAGE } from "@/lib/mobile-support";

const SAVE_DEBOUNCE_MS = 600;

// "desktop" renders the preview responsively, filling the panel (the
// original behavior) — tablet/mobile render the iframe at that literal
// device resolution, scaled to fit, so the embedded game's own CSS/JS sees
// (and reacts to) that actual viewport size rather than just looking smaller.
const DEVICE_PRESETS: { id: "desktop" | "tablet" | "mobile"; label: string; icon: typeof Monitor; size: DeviceSize | null }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor, size: null },
  { id: "tablet", label: "Tablet", icon: Tablet, size: { width: 820, height: 1180 } },
  { id: "mobile", label: "Mobile", icon: Smartphone, size: { width: 390, height: 844 } },
];

// Every game now speaks the BRANDING_CONTRACT.md postMessage protocol (see
// each game's brand-bridge), so the live preview works for all of them —
// not just the one `games` row currently marked brandSupport "full". Preview
// bundles are built into citrus-landing/public/game-previews/<slug>/.
const PREVIEW_BASE_PATHS: Record<string, string> = {
  "space-shooter-1": "/game-previews/space-shooter-1/",
  "cyber-adventure": "/game-previews/cyber-adventure/",
  "basketball-shootout": "/game-previews/basketball-shootout/",
  "gesture-space-war": "/game-previews/gesture-space-war/",
  "boat-booth": "/game-previews/boat-booth/",
};

export default function Customize() {
  const { slug } = useParams<{ slug: string }>();
  const { data: game, isLoading, isError } = useGetGame(slug ?? "");

  const [theme, setTheme] = useState<BrandThemeMessage | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [device, setDevice] = useState<(typeof DEVICE_PRESETS)[number]>(DEVICE_PRESETS[0]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { mutate: saveDraft } = useUpsertBrandingDraft();
  const { mutate: finalizeDraft, isPending: isFinalizing } = useFinalizeBrandingDraft();

  useEffect(() => {
    if (game && !theme) {
      setTheme({
        primaryColor: game.defaultPrimaryColor,
        secondaryColor: game.defaultSecondaryColor,
        accentColor: game.defaultAccentColor,
        logoUrl: game.defaultLogoUrl ?? null,
        logoSize: 28,
        brandName: "",
        brandNameSize: 16,
        brandNameColor: "#ffffff",
        heading: game.defaultHeading,
        headingSize: 11,
        headingColor: "#94a3b8",
        tagline: "",
        bgUrl: null,
        fontUrl: null,
      });
    }
  }, [game, theme]);

  const draftToken = useMemo(() => getDraftToken(), []);

  const handleThemeChange = (next: BrandThemeMessage) => {
    setTheme(next);
    if (!game) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(
        {
          data: {
            gameId: game.id,
            draftToken,
            primaryColor: next.primaryColor,
            secondaryColor: next.secondaryColor,
            accentColor: next.accentColor,
            logoDataUrl: next.logoUrl,
            bgDataUrl: next.bgUrl,
            fontDataUrl: next.fontUrl,
            heading: next.heading,
            tagline: next.tagline,
          },
        },
        { onSuccess: (draft) => setDraftId(draft.id) },
      );
    }, SAVE_DEBOUNCE_MS);
  };

  const handleFinalize = () => {
    if (!draftId || !game) return;
    // Payment is bypassed for now (see OrderSummaryPanel) — finalizing a
    // draft immediately unlocks the live link, no Stripe/checkout step yet.
    finalizeDraft({ id: draftId, data: {} }, { onSuccess: (created) => setOrder(created) });
  };

  // The "live link" is just the game's own preview URL with the finalized
  // branding baked in as query params — every game's brand-bridge already
  // reads these on load (see BRANDING_CONTRACT.md), so this works standalone,
  // outside any iframe, with no server-side lookup or persistence required.
  const liveLink = useMemo(() => {
    if (!game || !theme) return null;
    const basePath = PREVIEW_BASE_PATHS[game.slug];
    if (!basePath) return null;
    const params = new URLSearchParams({
      brandName: theme.brandName,
      brandNameSize: String(theme.brandNameSize),
      brandNameColor: theme.brandNameColor,
      heading: theme.heading,
      headingSize: String(theme.headingSize),
      headingColor: theme.headingColor,
      tagline: theme.tagline,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      logoSize: String(theme.logoSize),
    });
    if (theme.logoUrl) {
      // A user-uploaded logo is a data: URI — far too large to embed
      // directly in a URL (blows past Node's request header size limit,
      // see api-server's /branding-drafts/:id/logo route). Reference the
      // already-persisted draft's logo by URL instead; anything else (e.g.
      // a game's defaultLogoUrl) is already a normal short URL.
      const logoParam =
        theme.logoUrl.startsWith("data:") && draftId
          ? `${window.location.origin}/api/branding-drafts/${draftId}/logo`
          : theme.logoUrl;
      params.set("logo", logoParam);
    }
    if (theme.bgUrl) {
      const bgParam =
        theme.bgUrl.startsWith("data:") && draftId
          ? `${window.location.origin}/api/branding-drafts/${draftId}/bg`
          : theme.bgUrl;
      params.set("bg", bgParam);
    }
    if (theme.fontUrl) {
      const fontParam =
        theme.fontUrl.startsWith("data:") && draftId
          ? `${window.location.origin}/api/branding-drafts/${draftId}/font`
          : theme.fontUrl;
      params.set("font", fontParam);
    }
    // Every other param here is just the current branding *values* — two
    // users who both leave everything at its defaults would otherwise
    // produce byte-for-byte identical links despite being separate orders
    // (draftToken already keeps their underlying drafts apart, see
    // draft-token.ts; this is only about the shared link text). Stamping
    // the finalized order's own id in makes every live link unique the
    // moment it's actually handed out, regardless of whether the branding
    // itself is unique. Ignored by every game's brand-bridge (it only reads
    // known keys — see game/BRANDING_CONTRACT.md), so it's a no-op for
    // playback, just an identity marker for the link itself.
    if (order) {
      params.set("orderId", order.id);
    }
    return `${window.location.origin}${basePath}?${params.toString()}`;
  }, [game, theme, draftId, order]);

  if (isLoading || !theme) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto px-6 pt-32 text-center text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto px-6 pt-32 text-center text-destructive">Game not found.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-6 md:px-12 pt-28 pb-24">
        <Link href="/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} /> Back to catalog
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          Customize {game.name}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-10">
          <div>
            {PREVIEW_BASE_PATHS[game.slug] ? (
              <>
                <div className="flex items-center justify-center gap-1.5 mb-1.5 rounded-lg border border-border bg-muted/50 p-1 w-fit mx-auto">
                  {DEVICE_PRESETS.map((preset) => {
                    const isUnsupportedPreset = preset.id === "mobile" && MOBILE_UNSUPPORTED.has(game.slug);
                    return (
                      <Button
                        key={preset.id}
                        type="button"
                        size="sm"
                        variant={device.id === preset.id ? "default" : "ghost"}
                        className="gap-1.5"
                        disabled={isUnsupportedPreset}
                        onClick={() => setDevice(preset)}
                        title={isUnsupportedPreset ? MOBILE_UNSUPPORTED_MESSAGE : undefined}
                        data-testid={`button-preview-${preset.id}`}
                      >
                        <preset.icon size={14} />
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
                {MOBILE_UNSUPPORTED.has(game.slug) && (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-3 text-center">
                    <AlertTriangle size={13} className="shrink-0" />
                    {MOBILE_UNSUPPORTED_MESSAGE}
                  </p>
                )}
                <GamePreviewFrame
                  previewBasePath={PREVIEW_BASE_PATHS[game.slug]}
                  theme={theme}
                  deviceSize={device.size}
                />
              </>
            ) : (
              <div className="rounded-xl border border-border bg-card aspect-[4/3] w-full flex items-center justify-center text-center p-8">
                <p className="text-muted-foreground text-sm">
                  Live in-game re-skinning isn't wired up for {game.name} yet — logo and heading
                  changes below will still apply once it is. Try{" "}
                  <Link href="/customize/space-shooter-1" className="text-primary underline">
                    Space Shooter
                  </Link>{" "}
                  for the full live preview.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <BrandingForm
              theme={theme}
              onChange={handleThemeChange}
              canvasReskinSupported={game.brandSupport === "full"}
              gameSlug={game.slug}
            />
            <div className="text-center">
              <ContactCustomUiDialog gameId={game.id} />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <OrderSummaryPanel
            gameName={game.name}
            priceCents={game.priceCents}
            order={order}
            isFinalizing={isFinalizing}
            onFinalize={handleFinalize}
            liveLink={liveLink}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
