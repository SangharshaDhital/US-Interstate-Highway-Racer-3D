import React from 'react';
import { CameraView, HighwayConfig, PlayerCarState, WeatherCondition } from '../game/types.ts';
import { HighwayShield } from './HighwayBadges.tsx';

interface GameHudProps {
  playerState: PlayerCarState;
  highway: HighwayConfig;
  weather: WeatherCondition;
  cameraView: CameraView;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleHeadlights: () => void;
  onPause: () => void;
  onTriggerThruster?: (active: boolean) => void;
  onToggleVacuum?: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  playerState,
  highway,
  weather,
  cameraView,
  isMuted,
  onToggleMute,
  onToggleCamera,
  onToggleHeadlights,
  onPause,
  onTriggerThruster,
  onToggleVacuum,
}) => {
  const speed = Math.round(playerState.speedMph);
  const distanceMiles = (playerState.totalDistanceMeters * 0.000621371).toFixed(1);
  const nitro = Math.round(playerState.nitroRemaining);
  const thrusterFuel = Math.round(playerState.thrusterFuel);
  const health = Math.round(playerState.health);
  const hasCeiling = playerState.inTunnel || playerState.inOverpass;

  // Weather indicator icon
  const weatherIcons: Record<WeatherCondition, string> = {
    clear: '☀️ Clear',
    sunset: '🌅 Sunset',
    rain: '🌧️ Heavy Rain',
    snow: '❄️ Blizzard',
    fog: '🌫️ Fog',
    night: '🌙 Midnight',
  };

  const isShielded = (playerState.invulnerableTimer ?? 0) > 0;
  const steerDir =
    playerState.steeringAngle < -0.08
      ? '◀ STEER LEFT'
      : playerState.steeringAngle > 0.08
      ? 'STEER RIGHT ▶'
      : '▲ CENTER LINE';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none text-white font-sans p-2.5 md:p-6 flex flex-col justify-between">
      {/* Top Bar: Route Info (Top-Left) & Quick Controls (Top-Right) */}
      <div className="flex items-start justify-between gap-1.5 md:gap-3">
        {/* Top-Left: Highway Shield & Distance */}
        <div className="bg-slate-950/92 border border-slate-700/80 rounded-2xl p-2 md:p-3 flex items-center gap-2 md:gap-3 shadow-xl max-w-[180px] sm:max-w-sm pointer-events-auto">
          <HighwayShield
            type={highway.shieldType}
            number={highway.routeNumber}
            className="w-9 h-9 md:w-12 md:h-12 shrink-0 drop-shadow"
          />
          <div className="min-w-0">
            <div className="text-[11px] md:text-xs font-black uppercase text-amber-400 tracking-wider truncate">
              {highway.name}
            </div>
            <div className="text-[10px] md:text-[11px] text-slate-300 font-medium truncate">
              {highway.fromTo}
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1 text-[9px] md:text-[10px] font-mono text-slate-400">
              <span className="text-emerald-400 font-bold tabular-nums">{distanceMiles} MI</span>
              <span>•</span>
              <span className="truncate">{weatherIcons[weather]}</span>
            </div>
          </div>
        </div>

        {/* Top-Right: Quick Controls (Mute, Camera, Lights, Pause) */}
        <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto shrink-0">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-950/90 border border-slate-700 hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-lg"
          >
            {isMuted ? (
              <svg className="w-4 h-4 md:w-5 md:h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          {/* Camera View Switch */}
          <button
            onClick={onToggleCamera}
            aria-label="Change Camera View"
            className="px-2 md:px-3 h-9 md:h-10 rounded-xl bg-slate-950/90 border border-slate-700 hover:bg-slate-800 text-[11px] md:text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-lg"
          >
            <span className="text-slate-400 hidden sm:inline">CAM:</span>
            <span className="text-blue-400 uppercase">{cameraView}</span>
          </button>

          {/* Headlights Toggle */}
          <button
            onClick={onToggleHeadlights}
            aria-label="Toggle Headlights"
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              playerState.headlightsOn
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-950/90 border-slate-700 text-slate-500 hover:bg-slate-800'
            }`}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            aria-label="Pause Game"
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-950/90 border border-slate-700 hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-lg text-slate-300"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Thrill: Near Miss Combo Toast */}
      {playerState.nearMissCombo > 0 && (
        <div className="self-center flex flex-col items-center pointer-events-none">
          <div className="bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-wider shadow-xl flex items-center gap-2">
            <span>⚡ NEAR MISS COMBO</span>
            <span className="text-white text-base font-extrabold px-2 py-0.5 bg-black/40 rounded-full">
              x{playerState.nearMissCombo}
            </span>
          </div>
          <div className="text-xs text-amber-300 font-mono mt-1 font-bold">
            +{(250 * Math.min(playerState.nearMissCombo, 10)).toLocaleString()} PTS
          </div>
        </div>
      )}

      {/* Bottom Perimeter Clusters: Health/Thruster/Nitro (Left), Special Action Dock (Bottom-Center), & Speedometer (Right) */}
      <div className="flex items-end justify-between gap-2 md:gap-3 mb-36 lg:mb-0">
        {/* Bottom Left: Vehicle Condition, Thruster Fuel, Nitro & Score */}
        <div className="bg-slate-950/92 border border-slate-700/80 rounded-2xl p-2.5 md:p-4 shadow-2xl flex flex-col gap-1.5 md:gap-2 min-w-[155px] md:min-w-[210px] pointer-events-auto">
          {/* Hull Condition + Post-Crash Shield / Nano-Repair */}
          <div>
            <div className="flex justify-between items-center text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
              <span className="text-slate-300 flex items-center gap-1">
                <span>Hull Armor</span>
                {isShielded ? (
                  <span className="text-[9px] px-1 rounded bg-cyan-500/25 text-cyan-300 font-mono">SHIELD</span>
                ) : health < 100 && speed > 25 ? (
                  <span className="text-[9px] text-emerald-400 font-mono">+REPAIR</span>
                ) : null}
              </span>
              <span className={health < 30 ? 'text-red-400 font-mono tabular-nums' : 'text-emerald-300 font-mono tabular-nums'}>
                {health}%
              </span>
            </div>
            <div className="w-full h-1.5 md:h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-100 ${
                  isShielded
                    ? 'bg-cyan-400'
                    : health > 50
                    ? 'bg-emerald-500'
                    : health > 25
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          {/* Rocket Thruster Fuel */}
          <div>
            <div className="flex justify-between text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
              <span className="text-orange-400 flex items-center gap-1">
                <span>🚀 Thrusters</span>
                {playerState.isFlying && <span className="text-[9px] text-orange-300 font-mono">(FLYING)</span>}
              </span>
              <span className="text-orange-300 font-mono tabular-nums">{thrusterFuel}%</span>
            </div>
            <div className="w-full h-1.5 md:h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-75 shadow-sm"
                style={{ width: `${thrusterFuel}%` }}
              />
            </div>
          </div>

          {/* Nitro Gauge */}
          <div>
            <div className="flex justify-between text-[10px] md:text-[11px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
              <span className="text-cyan-400">Nitro Boost</span>
              <span className="text-cyan-300 font-mono tabular-nums">{nitro}%</span>
            </div>
            <div className="w-full h-1.5 md:h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75 shadow-sm"
                style={{ width: `${nitro}%` }}
              />
            </div>
          </div>

          {/* Score Readout */}
          <div className="pt-1 md:pt-1.5 border-t border-slate-800 flex justify-between items-center text-[11px] md:text-xs">
            <span className="text-slate-400 font-bold uppercase">Score</span>
            <span className="font-mono font-black text-amber-400 tabular-nums">
              {playerState.score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bottom Center Special Actions Dock: Rocket Thrusters & Vacuum Mode (Desktop) */}
        <div className="hidden lg:flex items-center gap-2.5 pointer-events-auto mb-7">
          {/* Rocket Thruster Launch Button */}
          <button
            onMouseDown={() => onTriggerThruster?.(true)}
            onMouseUp={() => onTriggerThruster?.(false)}
            onTouchStart={(e) => {
              e.preventDefault();
              onTriggerThruster?.(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onTriggerThruster?.(false);
            }}
            className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer select-none shadow-xl ${
              playerState.isFlying
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 border-amber-300 text-white shadow-orange-600/50 scale-105 ring-2 ring-orange-400'
                : thrusterFuel > 15
                ? 'bg-slate-950/92 border-orange-500/80 text-orange-400 hover:bg-orange-500/20 active:scale-95'
                : 'bg-slate-950/75 border-slate-700 text-slate-500 opacity-60'
            }`}
          >
            <span className="text-base">🚀</span>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span>THRUSTERS [R / SPACE]</span>
                <span className="text-[10px] font-mono font-black">{thrusterFuel}%</span>
              </div>
              <div className="text-[9px] font-mono lowercase text-orange-200">
                {playerState.isFlying ? 'soaring airborne' : 'hold to fly over traffic'}
              </div>
            </div>
          </button>

          {/* Vacuum Ceiling Latch Button */}
          <button
            onClick={() => onToggleVacuum?.()}
            className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer select-none shadow-xl ${
              playerState.isInverted
                ? 'bg-gradient-to-r from-cyan-600 to-blue-500 border-cyan-300 text-white shadow-cyan-600/50 scale-105 ring-2 ring-cyan-400'
                : playerState.vacuumActive
                ? 'bg-cyan-950/92 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/50'
                : hasCeiling
                ? 'bg-slate-950/92 border-cyan-400 text-cyan-300 hover:bg-cyan-500/20'
                : 'bg-slate-950/90 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="text-base">🧲</span>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span>VACUUM MODE [V]</span>
                {playerState.isInverted && (
                  <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] text-cyan-300 font-mono font-bold">
                    UPSIDE-DOWN
                  </span>
                )}
              </div>
              <div className="text-[9px] font-mono lowercase text-cyan-200">
                {playerState.isInverted
                  ? 'ceiling locked (tap V to drop)'
                  : hasCeiling
                  ? 'overpass / tunnel overhead! tap V'
                  : 'ready for next tunnel / overpass'}
              </div>
            </div>
          </button>
        </div>

        {/* Bottom Right: High-Precision Speedometer Cluster */}
        <div
          className={`bg-slate-950/92 border rounded-2xl md:rounded-3xl p-2.5 md:p-5 shadow-2xl flex flex-col items-center min-w-[155px] md:min-w-[215px] pointer-events-auto transition-all duration-150 ${
            playerState.isFlying
              ? 'border-orange-500 ring-2 ring-orange-500/50 shadow-orange-950/70'
              : playerState.isInverted
              ? 'border-cyan-400 ring-2 ring-cyan-400/60 shadow-cyan-950/70'
              : playerState.isBoosting
              ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-900/50'
              : speed > 180
              ? 'border-red-500/80 shadow-red-900/40 ring-1 ring-red-500/40'
              : 'border-slate-700/90'
          }`}
        >
          <div className="flex items-baseline gap-1">
            <span
              className={`text-4xl md:text-6xl font-black italic tracking-tighter tabular-nums font-mono drop-shadow transition-colors ${
                playerState.isFlying
                  ? 'text-orange-300 drop-shadow-[0_0_16px_rgba(249,115,22,0.9)]'
                  : playerState.isInverted
                  ? 'text-cyan-300 drop-shadow-[0_0_16px_rgba(6,182,212,0.9)]'
                  : playerState.isBoosting
                  ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]'
                  : speed > 180
                  ? 'text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                  : speed > 130
                  ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]'
                  : 'text-white'
              }`}
            >
              {speed}
            </span>
            <span className="text-xs font-black text-red-500 tracking-wider">MPH</span>
          </div>

          {/* RPM Bar */}
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>
                GEAR <strong className="text-white text-xs">{playerState.gear}</strong>
              </span>
              <span className="text-cyan-300 font-bold">{steerDir}</span>
              <span>{(playerState.rpm * 8).toFixed(1)}k</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-700">
              {Array.from({ length: 12 }).map((_, i) => {
                const filled = i / 12 <= playerState.rpm;
                const isRedline = i >= 10;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-75 ${
                      filled
                        ? isRedline
                          ? 'bg-red-500'
                          : i > 7
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Mode status banner */}
          <div className="h-5 mt-2 flex items-center justify-center text-center">
            {playerState.isFlying ? (
              <span className="text-[10px] font-black text-orange-400 tracking-widest uppercase">
                🚀 ROCKET FLIGHT AIRBORNE
              </span>
            ) : playerState.isInverted ? (
              <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">
                🧲 180° CEILING RIDE ACTIVE
              </span>
            ) : playerState.isBoosting ? (
              <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">
                ⚡ NITRO WARP ACTIVE
              </span>
            ) : playerState.isDrifting ? (
              <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase">
                🔥 POWER DRIFT
              </span>
            ) : speed > 190 ? (
              <span className="text-[10px] font-black text-red-400 tracking-widest uppercase">
                ⚡ SUPERSONIC VELOCITY
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
                CRUISING HIGHWAY
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
