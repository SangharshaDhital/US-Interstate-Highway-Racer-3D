import React from 'react';
import { PlayerCarState } from '../game/types.ts';

interface SpeedEffectsOverlayProps {
  playerState: PlayerCarState;
}

export const SpeedEffectsOverlay: React.FC<SpeedEffectsOverlayProps> = ({ playerState }) => {
  const speed = Math.round(playerState.speedMph);
  const isBoosting = playerState.isBoosting;
  const isDrafting = playerState.isDrafting;
  const isFlying = playerState.isFlying;
  const isInverted = playerState.isInverted;
  const altitudeFt = (playerState.y * 3.28084).toFixed(1);

  // Speed factor: 0 at 60 mph up to 1 at 220+ mph
  const speedFactor = Math.max(0, Math.min(1.2, (speed - 60) / 160));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {/* 1. Rocket Thrusters Flight Mode Plasma Flare */}
      {isFlying && (
        <div className="absolute inset-0 transition-opacity duration-150">
          {/* Supersonic boundary glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-orange-600/25 via-transparent to-cyan-500/15" />
          {/* Fiery side heat haze */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-orange-500/25 to-transparent" />
          {/* Airborne Altitude & Flight HUD Indicator */}
          <div className="absolute top-36 md:top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-max max-w-[92vw]">
            <div className="bg-slate-950/92 border-2 border-orange-400 text-orange-300 px-4 md:px-5 py-2 rounded-2xl shadow-[0_0_25px_rgba(249,115,22,0.6)] flex items-center gap-3">
              <span className="text-xl">🚀</span>
              <div>
                <div className="text-xs font-black tracking-widest uppercase text-white flex items-center gap-2">
                  <span>ROCKET THRUSTERS AIRBORNE</span>
                  <span className="px-1.5 py-0.5 rounded bg-orange-500 text-black text-[10px] font-mono font-bold">
                    FLIGHT
                  </span>
                </div>
                <div className="text-[11px] font-mono text-orange-200 mt-0.5 flex items-center gap-3">
                  <span>ALTITUDE: <strong className="text-white text-xs">{altitudeFt} FT</strong></span>
                  <span>•</span>
                  <span>MACH {(speed / 767).toFixed(2)}</span>
                  <span>•</span>
                  <span className="text-cyan-300">OVERPASS CLEAR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Vacuum Inverted Mode (Tunnel & Overpass Ceiling Ride) Overlay */}
      {isInverted && (
        <div className="absolute inset-0 transition-opacity duration-200">
          {/* Cyan magnetic ceiling grid vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-600/25 via-transparent to-slate-950/40" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-400/20 to-transparent" />
          {/* Inverted Ceiling Lock Telemetry Toast */}
          <div className="absolute top-36 md:top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-max max-w-[92vw]">
            <div className="bg-slate-950/92 border-2 border-cyan-400 text-cyan-300 px-5 py-2 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center gap-3">
              <span className="text-xl">🧲</span>
              <div>
                <div className="text-xs font-black tracking-widest uppercase text-white flex items-center gap-2">
                  <span>VACUUM CEILING LOCK ACTIVE</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 text-[10px] font-mono font-black">
                    180° INVERTED
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-200 mt-0.5 flex items-center gap-3">
                  <span className="text-emerald-300 font-bold">OVERHEAD SUCTION 100%</span>
                  <span>•</span>
                  <span>CEILING BONUS +350 PTS/S</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Nitro Screen Shockwave / Radial Burst */}
      {isBoosting && !isFlying && (
        <div
          className="absolute inset-0 bg-radial from-transparent via-cyan-500/10 to-blue-600/30 transition-opacity duration-150"
          style={{ opacity: 0.85 }}
        />
      )}

      {/* 4. High-Speed Radial Tunnel Vignette */}
      {speedFactor > 0.1 && (
        <div
          className="absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: Math.min(0.85, speedFactor * 0.75),
            background: `radial-gradient(ellipse at center, transparent ${Math.max(30, 60 - speedFactor * 25)}%, rgba(0, 0, 0, 0.45) 85%, rgba(0, 0, 0, 0.8) 100%)`,
          }}
        />
      )}

      {/* 5. Screen-Edge Wind Streaks & Speed Rush Lines */}
      {speedFactor > 0.15 && (
        <svg
          className="absolute inset-0 w-full h-full opacity-70 pointer-events-none"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop
                offset="70%"
                stopColor={isFlying ? '#fb923c' : isBoosting ? '#38bdf8' : '#e0f2fe'}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={isFlying ? '#ea580c' : isBoosting ? '#0ea5e9' : '#ffffff'}
                stopOpacity="0.85"
              />
            </linearGradient>
          </defs>

          {/* Left flank rush streaks */}
          <line x1="420" y1="460" x2="20" y2="100" stroke="url(#windGrad)" strokeWidth={1.5 + speedFactor * 2.8} />
          <line x1="400" y1="500" x2="5" y2="360" stroke="url(#windGrad)" strokeWidth={2.0 + speedFactor * 3.2} />
          <line x1="410" y1="540" x2="10" y2="660" stroke="url(#windGrad)" strokeWidth={1.8 + speedFactor * 2.8} />
          <line x1="430" y1="580" x2="40" y2="920" stroke="url(#windGrad)" strokeWidth={2.2 + speedFactor * 3.5} />

          {/* Right flank rush streaks */}
          <line x1="580" y1="460" x2="980" y2="100" stroke="url(#windGrad)" strokeWidth={1.5 + speedFactor * 2.8} />
          <line x1="600" y1="500" x2="995" y2="360" stroke="url(#windGrad)" strokeWidth={2.0 + speedFactor * 3.2} />
          <line x1="590" y1="540" x2="990" y2="660" stroke="url(#windGrad)" strokeWidth={1.8 + speedFactor * 2.8} />
          <line x1="570" y1="580" x2="960" y2="920" stroke="url(#windGrad)" strokeWidth={2.2 + speedFactor * 3.5} />

          {/* Top roof rush streaks */}
          <line x1="480" y1="440" x2="320" y2="10" stroke="url(#windGrad)" strokeWidth={1.8 + speedFactor * 2.5} />
          <line x1="520" y1="440" x2="680" y2="10" stroke="url(#windGrad)" strokeWidth={1.8 + speedFactor * 2.5} />
        </svg>
      )}

      {/* 6. Slipstream Drafting Banner */}
      {isDrafting && !isFlying && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-950/92 border border-emerald-400/80 px-4 py-1.5 rounded-full shadow-2xl">
          <span className="text-xs font-black tracking-widest uppercase text-emerald-300">
            SLIPSTREAM DRAFTING +SPEED
          </span>
        </div>
      )}

      {/* 7. Nitro Warp Text Flash */}
      {isBoosting && !isFlying && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="text-cyan-400 font-mono text-xs tracking-widest font-extrabold uppercase drop-shadow-md bg-slate-950/90 px-3.5 py-1.5 rounded-full border border-cyan-500/40">
            ⚡ WARP SPEED BOOST ACTIVE
          </div>
        </div>
      )}
    </div>
  );
};
