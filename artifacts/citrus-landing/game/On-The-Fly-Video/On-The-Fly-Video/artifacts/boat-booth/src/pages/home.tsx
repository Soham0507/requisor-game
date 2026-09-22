import React from "react";
import { Link } from "wouter";
import {
  useListGenerations,
  useGetBoothStats,
  getListGenerationsQueryKey,
  getGetBoothStatsQueryKey,
} from "@workspace/api-client-react";
import { Anchor, Camera, ChevronRight, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/brand-bridge";

export default function Home() {
  const brand = useBrand();
  const { data: stats } = useGetBoothStats({
    query: { queryKey: getGetBoothStatsQueryKey(), refetchInterval: 10000 },
  });
  const { data: recentGenerations } = useListGenerations(
    { limit: 12 },
    { query: { queryKey: getListGenerationsQueryKey({ limit: 12 }), refetchInterval: 10000 } },
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Brand badge — top-left corner */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.brandName}
            className="object-contain"
            style={{ width: brand.logoSize, height: brand.logoSize }}
          />
        ) : (
          <div
            className="rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              width: brand.logoSize,
              height: brand.logoSize,
              background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.primaryColor}66)`,
            }}
          >
            <ImageIcon className="text-white/80" size={16} />
          </div>
        )}
        <span
          className="font-semibold tracking-wide"
          style={{ fontSize: brand.brandNameSize, color: brand.brandNameColor, fontFamily: "var(--brand-font, inherit)" }}
        >
          {brand.brandName}
        </span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-7xl mx-auto w-full z-10 relative">
        <div className="text-center space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-medium text-sm tracking-wide uppercase mb-4">
            <Anchor className="w-4 h-4" />
            Interactive Booth Experience
          </div>
          <h1
            className="font-black text-foreground tracking-tight max-w-4xl mx-auto leading-tight"
            style={{ fontSize: `clamp(2.5rem, 7vw, ${brand.headingSize}px)`, fontFamily: "var(--brand-font, inherit)" }}
          >
            {brand.heading}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {brand.tagline}
          </p>

          <div className="pt-8">
            <Link href="/create" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-24 px-12 py-6 rounded-full text-3xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95">
              Start Your Experience
              <ChevronRight className="w-8 h-8 ml-2" />
            </Link>
          </div>
        </div>

        {/* Live Gallery & Stats */}
        <div className="w-full mt-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card/50 backdrop-blur-xl border border-card-border p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Live Stats
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-black text-primary">
                    {stats?.totalCreations || 0}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Total Creations Today
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black text-secondary">
                    {stats?.videosCreated || 0}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Videos Generated
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recentGenerations?.slice(0, 8).map((gen, i) => (
                <div 
                  key={gen.id} 
                  className="aspect-[4/3] rounded-2xl overflow-hidden relative group bg-muted animate-in fade-in zoom-in-95 duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {gen.photoUrl ? (
                    <img 
                      src={gen.photoUrl} 
                      alt="Generation" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Camera className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white font-medium text-sm drop-shadow-md">
                      {gen.sceneName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
