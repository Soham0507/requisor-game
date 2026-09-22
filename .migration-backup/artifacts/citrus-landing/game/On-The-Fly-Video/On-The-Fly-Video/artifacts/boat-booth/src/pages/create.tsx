import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListScenes,
  useCreateGeneration,
  useStartVideo,
  useGetGeneration,
  getGetGenerationQueryKey,
  Scene,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Camera, ChevronLeft, RefreshCcw, Video, Download, ArrowRight, Loader2, Play } from "lucide-react";
import pontoonImg from "@assets/pontoon_wi.jpg_1780096222900.jpeg";
import wakeImg from "@assets/wakesurfing.jpg_1780096222900.jpeg";
import bassImg from "@assets/bass_fishing.jpg_1780096222901.jpeg";

const SCENE_IMAGES: Record<string, string> = {
  "pontoon-sunset": pontoonImg,
  "wakesurfing": wakeImg,
  "bass-fishing": bassImg,
};

type Step = "scene" | "capture" | "processing" | "result" | "video";

export default function Create() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("scene");
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: scenes, isLoading: loadingScenes } = useListScenes();
  const createGeneration = useCreateGeneration();
  const startVideo = useStartVideo();

  const { data: generation, refetch: refetchGeneration } = useGetGeneration(generationId || "", {
    query: {
      queryKey: getGetGenerationQueryKey(generationId || ""),
      enabled: !!generationId,
      refetchInterval: (query) => {
        if (!query.state.data) return 3000;
        const s = query.state.data.photoStatus;
        const vs = query.state.data.videoStatus;
        if (s === "pending" || vs === "pending") return 3000;
        return false;
      },
    },
  });

  // Flow handlers
  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene);
    setStep("capture");
  };

  const handleCapture = (base64: string) => {
    setPhotoBase64(base64);
  };

  const handleSubmit = async () => {
    if (!selectedScene || !photoBase64) return;
    setStep("processing");
    try {
      const res = await createGeneration.mutateAsync({
        data: { sceneId: selectedScene.id, photoBase64 },
      });
      setGenerationId(res.id);
    } catch (err) {
      console.error(err);
      // Handle error
    }
  };

  useEffect(() => {
    if (step === "processing" && generation?.photoStatus === "ready") {
      setStep("result");
    }
  }, [generation?.photoStatus, step]);

  useEffect(() => {
    if (step === "video" && generation?.videoStatus === "ready") {
      // video is ready
    }
  }, [generation?.videoStatus, step]);

  const handleAnimate = async () => {
    if (!generationId) return;
    setStep("video");
    try {
      const updated = await startVideo.mutateAsync({ id: generationId });
      // Seed the cache with the freshly-claimed row (videoStatus: "pending")
      // so the UI shows the rendering state and polling resumes immediately,
      // instead of using the stale "idle" snapshot.
      queryClient.setQueryData(getGetGenerationQueryKey(generationId), updated);
    } catch (err) {
      console.error(err);
      // Re-fetch so any backend-written "failed" status surfaces (with its
      // Try Again path) instead of leaving the UI stuck on the spinner.
      refetchGeneration();
    }
  };

  const reset = () => {
    setLocation("/");
  };

  const downloadFile = useCallback(async (url: string, baseName: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "bin").replace("jpeg", "jpg");
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 w-full p-8 z-50 flex items-center justify-between">
        <Button variant="ghost" size="lg" className="rounded-full text-lg" onClick={reset}>
          <ChevronLeft className="mr-2 w-6 h-6" /> Start Over
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-7xl mx-auto w-full z-10 relative mt-16">
        {step === "scene" && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black text-foreground mb-4">Choose Your Experience</h2>
              <p className="text-2xl text-muted-foreground">Select the vibe you want to capture today.</p>
            </div>
            
            {loadingScenes ? (
              <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {scenes?.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneSelect(scene)}
                    className="group text-left rounded-3xl overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-2 bg-card relative focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-4 focus:ring-offset-background"
                  >
                    <div className="aspect-[4/5] w-full relative overflow-hidden">
                      <img 
                        src={SCENE_IMAGES[scene.id]} 
                        alt={scene.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-8">
                        <h3 className="text-3xl font-bold text-white mb-2">{scene.name}</h3>
                        <p className="text-white/80 font-medium text-lg mb-2">{scene.tagline}</p>
                        <p className="text-white/60 text-sm">{scene.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "capture" && (
          <div className="w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-foreground mb-2">Strike a Pose</h2>
              <p className="text-xl text-muted-foreground">Look at the camera and smile.</p>
            </div>
            
            <div className="bg-card rounded-[2rem] p-4 shadow-2xl border border-card-border overflow-hidden">
              <WebcamCapture onCapture={handleCapture} />
            </div>

            {photoBase64 && (
              <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" variant="outline" className="rounded-full text-lg h-16 px-8" onClick={() => setPhotoBase64(null)}>
                  <RefreshCcw className="mr-2" /> Retake
                </Button>
                <Button size="lg" className="rounded-full text-lg h-16 px-12 bg-primary text-primary-foreground" onClick={handleSubmit}>
                  Looks Good! <ArrowRight className="ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500 space-y-8">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 rounded-full border-8 border-primary/20 animate-[spin_3s_linear_infinite]" />
              <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent border-l-transparent animate-[spin_1.5s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-16 h-16 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-4xl font-black text-foreground">Creating Magic...</h2>
            <p className="text-xl text-muted-foreground max-w-md">Our AI is putting you on the water. This takes just a moment.</p>
          </div>
        )}

        {step === "result" && generation?.photoUrl && (
          <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/50 relative group aspect-[4/3]">
                <img src={generation.photoUrl} alt="Your creation" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-8">
                <div>
                  <h2 className="text-5xl font-black text-foreground mb-4">Wow, look at you!</h2>
                  <p className="text-2xl text-muted-foreground">Your {generation.sceneName} experience looks incredible.</p>
                </div>
                
                <div className="bg-card p-8 rounded-3xl shadow-xl border border-card-border space-y-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Video className="text-secondary" /> Want to see it move?
                  </h3>
                  <p className="text-lg text-muted-foreground">We can animate this photo into a cinematic video right now.</p>
                  <Button size="lg" className="w-full h-20 text-2xl rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg" onClick={handleAnimate}>
                    <Play className="mr-3 w-8 h-8" /> Animate My Photo
                  </Button>
                </div>
                
                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full text-lg h-14 px-8"
                    onClick={() => generation.photoUrl && downloadFile(generation.photoUrl, "boat-booth-photo")}
                  >
                    <Download className="mr-2 w-5 h-5" /> Download Photo
                  </Button>
                  <Button variant="ghost" size="lg" className="text-lg" onClick={reset}>
                    I'm done, next guest
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "video" && (
          <div className="w-full max-w-5xl mx-auto animate-in fade-in zoom-in-95">
             <div className="text-center mb-8">
              <h2 className="text-5xl font-black text-foreground mb-4">
                {generation?.videoStatus === "ready" && generation?.videoUrl
                  ? "Your Video is Ready"
                  : generation?.videoStatus === "failed"
                    ? "Something Went Wrong"
                    : "Creating Your Video"}
              </h2>
            </div>

            <div className="rounded-[2rem] overflow-hidden bg-black w-full max-h-[70vh] aspect-video relative flex items-center justify-center">
              {generation?.videoStatus === "ready" && generation?.videoUrl ? (
                <video 
                  src={generation.videoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : generation?.videoStatus === "failed" ? (
                <div className="flex flex-col items-center space-y-6 text-white p-12 text-center">
                  <p className="text-2xl font-medium">We couldn't render your video.</p>
                  <Button
                    size="lg"
                    className="h-16 px-10 text-xl rounded-full bg-primary text-primary-foreground"
                    onClick={handleAnimate}
                  >
                    <RefreshCcw className="mr-2 w-6 h-6" /> Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-6 text-white p-12">
                   <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-secondary/30 animate-[spin_2s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-full border-4 border-secondary border-t-transparent animate-[spin_1s_linear_infinite]" />
                  </div>
                  <p className="text-2xl font-medium animate-pulse">Rendering your cinematic moment...</p>
                </div>
              )}
            </div>

            {generation?.videoStatus === "ready" && (
              <div className="mt-12 flex flex-wrap justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-24 px-12 text-2xl rounded-full"
                  onClick={() => generation.videoUrl && downloadFile(generation.videoUrl, "boat-booth-video")}
                >
                  <Download className="mr-3 w-8 h-8" /> Download Video
                </Button>
                <Button size="lg" className="h-24 px-16 text-3xl rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 transition-transform" onClick={reset}>
                  Finish & Start Over
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Subcomponent for Webcam
function WebcamCapture({ onCapture }: { onCapture: (base64: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]); // Removed stream from deps to prevent loop

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Mirror drawing
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(base64);
    onCapture(base64);
  };

  const startCountdown = () => {
    setCountdown(3);
    let count = 3;
    const int = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(int);
        setCountdown(null);
        takePhoto();
      }
    }, 1000);
  };

  if (hasError) {
    return (
      <div className="aspect-video bg-muted flex flex-col items-center justify-center p-12 text-center rounded-2xl">
        <Camera className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-2xl font-bold mb-2">Camera Unavailable</h3>
        <p className="text-muted-foreground">Please allow camera access or use an alternative device.</p>
        <div className="mt-8">
           <label className="cursor-pointer bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-lg hover:bg-primary/90">
             Upload Photo Instead
             <input type="file" accept="image/*" className="hidden" onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => {
                   const res = ev.target?.result as string;
                   setCaptured(res);
                   onCapture(res);
                 };
                 reader.readAsDataURL(file);
               }
             }} />
           </label>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
      {captured ? (
        <img src={captured} alt="Captured" className="w-full h-full object-cover scale-x-[-1]" />
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          
          {countdown !== null ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
              <span className="text-[15rem] font-black text-white drop-shadow-2xl animate-in zoom-in duration-300">
                {countdown}
              </span>
            </div>
          ) : (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
              <button 
                onClick={startCountdown}
                className="w-24 h-24 rounded-full border-4 border-white/50 flex items-center justify-center bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
              >
                <div className="w-16 h-16 bg-white rounded-full shadow-lg" />
              </button>
            </div>
          )}

          {/* Grid overlay for framing */}
          <div className="absolute inset-0 pointer-events-none opacity-20 hidden md:block">
            <div className="w-full h-full flex flex-col justify-evenly">
              <div className="border-t border-white/50 w-full" />
              <div className="border-t border-white/50 w-full" />
            </div>
            <div className="absolute inset-0 flex justify-evenly">
              <div className="border-l border-white/50 h-full" />
              <div className="border-l border-white/50 h-full" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
