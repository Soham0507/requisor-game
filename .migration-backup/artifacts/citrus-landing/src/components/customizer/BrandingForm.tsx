import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BrandThemeMessage } from "./GamePreviewFrame";

const MAX_LOGO_DIMENSION = 256;
const MAX_BG_IMAGE_DIMENSION = 1920;
const MAX_BG_VIDEO_BYTES = 15 * 1024 * 1024; // 15MB — keeps the draft save well under the server's 50mb JSON body limit
const MAX_FONT_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a single woff2/woff/ttf/otf file
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FONT_EXTENSIONS = /\.(woff2?|ttf|otf)$/i;

// Landing-screen background upload is a per-game opt-in, not a generic
// capability every game's brand-bridge understands yet.
const BACKGROUND_MEDIA_SLUGS = new Set(["basketball-shootout"]);

interface BrandingFormProps {
  theme: BrandThemeMessage;
  onChange: (theme: BrandThemeMessage) => void;
  canvasReskinSupported: boolean;
  gameSlug: string;
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

/**
 * A color swatch (native picker, for eyedropper/visual selection) paired
 * with a plain hex text input — typing/pasting a hex code is the primary
 * way in, the swatch is a secondary convenience. Keeps its own draft text
 * so an in-progress, not-yet-valid hex (e.g. "#ff8") doesn't get clobbered
 * by the parent re-rendering with the last-committed value.
 */
function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (raw: string) => {
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    if (HEX_COLOR.test(v)) onChange(v.toLowerCase());
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded-md border border-border p-0.5 bg-transparent cursor-pointer"
        />
        <Input
          id={id}
          data-testid={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setDraft(value)}
          placeholder="#ffffff"
          maxLength={7}
          className="font-mono text-xs h-9"
        />
      </div>
    </div>
  );
}

/** Resizes an image file down to fit within maxDimension so it can be stored as a data URL without an object-storage integration. */
function resizeImageToDataUrl(file: File, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Reads a file as-is (no re-encoding) — used for video, which can't be resized/compressed client-side without heavy lifting. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function BrandingForm({ theme, onChange, canvasReskinSupported, gameSlug }: BrandingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const fontFileInputRef = useRef<HTMLInputElement>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const [fontFileName, setFontFileName] = useState<string | null>(null);

  const set = <K extends keyof BrandThemeMessage>(key: K, value: BrandThemeMessage[K]) =>
    onChange({ ...theme, [key]: value });

  const handleLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file, MAX_LOGO_DIMENSION);
    set("logoUrl", dataUrl);
  };

  const handleBgPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgError(null);
    if (file.type.startsWith("video/")) {
      if (file.size > MAX_BG_VIDEO_BYTES) {
        setBgError(`That video is too large — please pick one under ${Math.round(MAX_BG_VIDEO_BYTES / (1024 * 1024))}MB.`);
        return;
      }
      set("bgUrl", await readFileAsDataUrl(file));
    } else if (file.type.startsWith("image/")) {
      set("bgUrl", await resizeImageToDataUrl(file, MAX_BG_IMAGE_DIMENSION));
    } else {
      setBgError("Please choose an image or video file.");
    }
  };

  const handleFontPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontError(null);
    if (!FONT_EXTENSIONS.test(file.name)) {
      setFontError("Please choose a .woff2, .woff, .ttf, or .otf file.");
      return;
    }
    if (file.size > MAX_FONT_BYTES) {
      setFontError(`That font is too large — please pick one under ${Math.round(MAX_FONT_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    set("fontUrl", await readFileAsDataUrl(file));
    setFontFileName(file.name);
  };

  const isVideoBg = theme.bgUrl?.startsWith("data:video") || /\.(mp4|webm|mov)(\?|$)/i.test(theme.bgUrl ?? "");

  return (
    <div className="space-y-6">
      {!canvasReskinSupported && (
        <p className="text-xs text-muted-foreground bg-muted border border-border rounded-md px-3 py-2">
          Full in-game re-skin isn't wired up for this title yet — logo and heading still update live below.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="input-brand-name">Brand name</Label>
        <Input
          id="input-brand-name"
          data-testid="input-brand-name"
          value={theme.brandName}
          onChange={(e) => set("brandName", e.target.value)}
          placeholder="e.g. Acme Corp"
          maxLength={40}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="input-brand-name-size" className="text-xs text-muted-foreground">
              Size ({theme.brandNameSize}px)
            </Label>
            <input
              id="input-brand-name-size"
              data-testid="input-brand-name-size"
              type="range"
              min={10}
              max={100}
              value={theme.brandNameSize}
              onChange={(e) => set("brandNameSize", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <ColorField
            id="input-brand-name-color"
            label="Color"
            value={theme.brandNameColor}
            onChange={(hex) => set("brandNameColor", hex)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-heading">Game title</Label>
        <Input
          id="input-heading"
          data-testid="input-heading"
          value={theme.heading}
          onChange={(e) => set("heading", e.target.value)}
          maxLength={40}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="input-heading-size" className="text-xs text-muted-foreground">
              Size ({theme.headingSize}px)
            </Label>
            <input
              id="input-heading-size"
              data-testid="input-heading-size"
              type="range"
              min={8}
              max={100}
              value={theme.headingSize}
              onChange={(e) => set("headingSize", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <ColorField
            id="input-heading-color"
            label="Color"
            value={theme.headingColor}
            onChange={(hex) => set("headingColor", hex)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-tagline">Tagline</Label>
        <Input
          id="input-tagline"
          data-testid="input-tagline"
          value={theme.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          maxLength={60}
        />
      </div>

      <div className="space-y-3">
        <ColorField
          id="input-primary-color"
          label="Primary"
          value={theme.primaryColor}
          onChange={(hex) => set("primaryColor", hex)}
        />
        <ColorField
          id="input-secondary-color"
          label="Secondary"
          value={theme.secondaryColor}
          onChange={(hex) => set("secondaryColor", hex)}
        />
        <ColorField
          id="input-accent-color"
          label="Accent"
          value={theme.accentColor}
          onChange={(hex) => set("accentColor", hex)}
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {theme.logoUrl && (
            <img
              src={theme.logoUrl}
              alt="Logo preview"
              className="rounded-md object-cover border border-border"
              style={{ width: theme.logoSize, height: theme.logoSize }}
            />
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-logo">
            <Upload size={14} /> Upload logo
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoPick} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="input-logo-size" className="text-xs text-muted-foreground">
            Logo size ({theme.logoSize}px)
          </Label>
          <input
            id="input-logo-size"
            data-testid="input-logo-size"
            type="range"
            min={20}
            max={100}
            value={theme.logoSize}
            onChange={(e) => set("logoSize", Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Custom font</Label>
        <p className="text-xs text-muted-foreground">
          Upload a font (.woff2, .woff, .ttf, or .otf) to apply to the brand name and game title text.
        </p>
        {theme.fontUrl && (
          <>
            <style>{`@font-face { font-family: "BrandFontPreview"; src: url(${JSON.stringify(theme.fontUrl)}); }`}</style>
            <p
              className="rounded-md border border-border px-3 py-2 text-lg"
              style={{ fontFamily: "BrandFontPreview, inherit" }}
            >
              {theme.brandName || "Brand Name"}
            </p>
          </>
        )}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fontFileInputRef.current?.click()}
            data-testid="button-upload-font"
          >
            <Upload size={14} /> Upload font
          </Button>
          {theme.fontUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                set("fontUrl", null);
                setFontFileName(null);
              }}
              data-testid="button-remove-font"
            >
              Remove
            </Button>
          )}
          {fontFileName && <span className="text-xs text-muted-foreground truncate">{fontFileName}</span>}
        </div>
        <input
          ref={fontFileInputRef}
          type="file"
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
          className="hidden"
          onChange={handleFontPick}
        />
        {fontError && <p className="text-xs text-destructive">{fontError}</p>}
      </div>

      {BACKGROUND_MEDIA_SLUGS.has(gameSlug) && (
        <div className="space-y-2">
          <Label>Landing screen background</Label>
          <p className="text-xs text-muted-foreground">
            Upload an image or video to replace the default background (max {Math.round(MAX_BG_VIDEO_BYTES / (1024 * 1024))}MB for video).
          </p>
          {theme.bgUrl && (
            isVideoBg ? (
              <video
                src={theme.bgUrl}
                className="w-full aspect-video rounded-md border border-border object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={theme.bgUrl}
                alt="Background preview"
                className="w-full aspect-video rounded-md border border-border object-cover"
              />
            )
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => bgFileInputRef.current?.click()} data-testid="button-upload-bg">
              <Upload size={14} /> Upload background
            </Button>
            {theme.bgUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("bgUrl", null)} data-testid="button-remove-bg">
                Remove
              </Button>
            )}
          </div>
          <input ref={bgFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleBgPick} />
          {bgError && <p className="text-xs text-destructive">{bgError}</p>}
        </div>
      )}
    </div>
  );
}
