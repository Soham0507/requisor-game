import { motion } from "framer-motion";
import { GridScan } from './GridScan';
import { Hyperspeed } from './Hyperspeed';
import { useBrand } from "../brand-bridge";
import "./glitch.css";

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const brand = useBrand();
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Hyperspeed highway background */}
      <div className="fixed inset-0 z-0">
        <Hyperspeed
          effectOptions={{
            distortion: 'turbulentDistortion',
            length: 400,
            roadWidth: 10,
            islandWidth: 2,
            lanesPerRoad: 4,
            fov: 90,
            fovSpeedUp: 150,
            speedUp: 2,
            carLightsFade: 0.4,
            totalSideLightSticks: 20,
            lightPairsPerRoadWay: 40,
            shoulderLinesWidthPercentage: 0.05,
            brokenLinesWidthPercentage: 0.1,
            brokenLinesLengthPercentage: 0.5,
            lightStickWidth: [0.12, 0.5],
            lightStickHeight: [1.3, 1.7],
            movingAwaySpeed: [60, 80],
            movingCloserSpeed: [-120, -160],
            carLightsLength: [12, 80],
            carLightsRadius: [0.05, 0.14],
            carWidthPercentage: [0.3, 0.5],
            carShiftX: [-0.8, 0.8],
            carFloorSeparation: [0, 5],
            colors: {
              roadColor: 0x080808,
              islandColor: 0x0a0a0a,
              background: 0x000000,
              shoulderLines: 0xFFFFFF,
              brokenLines: 0xFFFFFF,
              leftCars: [0xD856BF, 0x6750A2, 0xC247AC],
              rightCars: [0x03B3C3, 0x0E5EA5, 0x324555],
              sticks: 0x03B3C3,
            },
          }}
        />
      </div>

      {/* GridScan overlay */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#2F293A"
          gridScale={0.1}
          scanColor="#FF9FFC"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>

      {/* Dark overlay */}
      <div className="fixed inset-0 z-[2] bg-black/50 pointer-events-none" />

      {/* Brand badge — top-left corner */}
      {brand.logoUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="fixed top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 "
        >
          <img
            src={brand.logoUrl}
            alt={brand.brandName}
            className="object-contain"
            style={{ width: brand.logoSize, height: brand.logoSize }}
          />
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full mx-4 text-center py-10"
      >
        {/* Game title */}
        <div>
          <h1
            className="glitch-strong"
            data-text={brand.brandName}
            style={{
              fontFamily: "var(--brand-font, var(--app-font-title))",
              fontSize: brand.brandNameSize,
              color: brand.brandNameColor,
            }}
          >
            <span>{brand.brandName}</span>
          </h1>
          <p
            className="mt-1 tracking-[0.2em] uppercase font-mono"
            style={{ fontSize: brand.headingSize, color: brand.headingColor, fontFamily: "var(--brand-font, inherit)" }}
          >
            {brand.heading}
          </p>
          <p className="text-sm mt-2 tracking-widest uppercase font-mono flex items-center gap-3 justify-center">
            <span className="text-cyan-400">[</span>
            <span>Defend Your System With Your Hands</span>
            <span className="text-pink-400">]</span>
          </p>
        </div>

        {/* How to play */}
        <div
          className="w-full p-4 rounded-xl text-left"
          style={{
            background: "rgba(7, 12, 25, 0.75)",
            border: "1px solid rgba(75, 85, 99, 0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-red-400 font-semibold mb-2 text-lg">How to Play</p>
          <div className="space-y-1.5 text-gray-300 text-sm leading-relaxed">
            <p>1. Your agent runs through a cyber threat landscape</p>
            <p>2. A cyber attack pops up — read the threat indicator</p>
            <p>3. Show 1–4 fingers on your webcam to pick the right defense</p>
            <p>4. Hold still for 1 second — gesture locks in automatically</p>
            <p>5. You have 10 seconds to answer — time out = game over!</p>
            <p>6. Score bonus for fast correct answers. Difficulty scales with speed!</p>
          </div>
        </div>

        <p className="text-gray-500 text-xs">
          Webcam access is required for gesture detection. You can also click options manually.
        </p>

        {/* Start button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="px-10 py-3.5 rounded-2xl text-lg font-black uppercase tracking-widest"
          style={{
            background: "linear-gradient(135deg, #1e40af, #2563eb)",
            border: "2px solid #3b82f6",
            color: "white",
            fontFamily: "var(--app-font-title)",
            boxShadow: "0 0 40px rgba(59, 130, 246, 0.5)",
          }}
        >
          Start Mission 🚀
        </motion.button>
      </motion.div>
    </div>
  );
}
