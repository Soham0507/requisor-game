import { useRef, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";

interface CameraFeedProps {
  detectedFingers: number | null;
  isConfirming: boolean;
  confirmProgress: number;
  confirmedFingers: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraEnabled: boolean;
}

export function CameraFeed({
  detectedFingers,
  isConfirming,
  confirmProgress,
  confirmedFingers,
  videoRef,
  canvasRef,
  cameraEnabled,
}: CameraFeedProps) {
  const getStatusText = () => {
    if (!cameraEnabled) return "Camera Off";
    if (confirmedFingers !== null) return `Locked: ${confirmedFingers}`;
    if (isConfirming && detectedFingers !== null) return `Confirming: ${detectedFingers}...`;
    if (detectedFingers !== null) return `Detected: ${detectedFingers}`;
    return "Show fingers (1-4)";
  };

  const getStatusColor = () => {
    if (confirmedFingers !== null) return "text-green-400";
    if (isConfirming) return "text-yellow-400";
    if (detectedFingers !== null) return "text-cyan-400";
    return "text-gray-400";
  };

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        className="relative rounded-xl overflow-hidden border-2"
        style={{
          borderColor: isConfirming
            ? "#facc15"
            : confirmedFingers !== null
            ? "#22c55e"
            : detectedFingers !== null
            ? "#22d3ee"
            : "#4b5563",
          width: 200,
          height: 150,
          background: "#111827",
          boxShadow: isConfirming
            ? "0 0 20px rgba(250, 204, 21, 0.4)"
            : confirmedFingers !== null
            ? "0 0 20px rgba(34, 197, 94, 0.4)"
            : "none",
        }}
      >
        {/* Hidden video element for MediaPipe input */}
        <video
          ref={videoRef}
          style={{ display: "none" }}
          playsInline
          muted
        />

        {/* Canvas shows the processed output */}
        <canvas
          ref={canvasRef}
          width={200}
          height={150}
          className="w-full h-full"
        />

        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
            <span className="text-gray-400 text-sm text-center px-2">
              Camera disabled
            </span>
          </div>
        )}

        {/* Confirm progress bar */}
        {isConfirming && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700">
            <motion.div
              className="h-full bg-yellow-400"
              style={{ width: `${confirmProgress}%` }}
            />
          </div>
        )}

        {/* Finger count overlay */}
        {detectedFingers !== null && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black bg-opacity-70 flex items-center justify-center"
          >
            <span className="text-white font-bold text-sm">{detectedFingers}</span>
          </motion.div>
        )}
      </div>

      {/* Status text */}
      <motion.p
        key={getStatusText()}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xs font-semibold tracking-wider uppercase ${getStatusColor()}`}
      >
        {getStatusText()}
      </motion.p>

      {/* Finger guide */}
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
              detectedFingers === n
                ? "bg-cyan-500 border-cyan-400 text-white scale-110"
                : confirmedFingers === n
                ? "bg-green-500 border-green-400 text-white"
                : "bg-gray-800 border-gray-600 text-gray-400"
            }`}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
