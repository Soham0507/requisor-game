import { Rocket } from "lucide-react";
import { useBrand } from "@/brand-bridge";

interface BrandMarkProps {
  /** Height of the mark in px. Width follows the logo's own proportions. */
  size: number;
}

/**
 * The customer's logo, shown whole (never cropped) on a soft tile so any
 * logo reads on the dark theme. With no logo uploaded it falls back to a
 * brand-colored placeholder tile.
 */
export default function BrandMark({ size }: BrandMarkProps) {
  const brand = useBrand();

  if (!brand.logoUrl) {
    return (
      <div
        className="brand-mark placeholder"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
        }}
        aria-hidden="true"
      >
        <Rocket size={Math.round(size * 0.5)} strokeWidth={2.4} />
      </div>
    );
  }

  return (
    <div className="brand-mark logo-only" style={{ height: size, maxWidth: size * 3.2 }}>
      {/* no box or border: the logo sits directly on the page.
          explicit pixel size: a percentage height does not constrain large raster logos here */}
      <img
        src={brand.logoUrl}
        alt=""
        style={{ height: size, width: "auto", maxWidth: size * 3.2 }}
      />
    </div>
  );
}
