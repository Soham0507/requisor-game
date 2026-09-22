import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Order } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderSummaryPanelProps {
  gameName: string;
  order: Order | null;
  isFinalizing: boolean;
  onFinalize: () => void;
  liveLink: string | null;
}

export function OrderSummaryPanel({ gameName, order, isFinalizing, onFinalize, liveLink }: OrderSummaryPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!liveLink) return;
    await navigator.clipboard.writeText(liveLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{gameName} — custom branding</p>

        {order ? (
          <div className="space-y-3">
            <p className="text-sm text-primary" data-testid="text-order-created">
              Branding finalized — order {order.id.slice(0, 8)} created.
            </p>
            {/* Payment is bypassed for now — no Stripe/checkout step exists
                yet, so finalizing a draft goes straight to a working live
                link instead of a payment wall. */}
            <p className="text-xs text-muted-foreground bg-muted border border-border rounded-md px-3 py-2">
              Payment is bypassed for now — here's your live link.
            </p>
            {liveLink && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input readOnly value={liveLink} data-testid="input-live-link" className="text-xs font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopy} data-testid="button-copy-live-link">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                </div>
                <a href={liveLink} target="_blank" rel="noopener noreferrer">
                  <Button type="button" className="w-full" data-testid="button-open-live-link">
                    <ExternalLink size={14} /> Open live link
                  </Button>
                </a>
              </div>
            )}
          </div>
        ) : (
          <Button className="w-full" onClick={onFinalize} disabled={isFinalizing} data-testid="button-finalize-branding">
            {isFinalizing ? "Finalizing…" : "Finalize branding — get live link"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
