import React from 'react';
import { HIGHWAY_LIST } from '../game/highways.ts';
import { VEHICLE_LIST } from '../game/physics.ts';
import { HighwayId, VehicleId, WeatherCondition } from '../game/types.ts';
import { HighwayShield } from './HighwayBadges.tsx';

interface TitleScreenProps {
  selectedHighwayId: HighwayId;
  selectedVehicleId: VehicleId;
  selectedWeather: WeatherCondition;
  onSelectHighway: (id: HighwayId) => void;
  onSelectVehicle: (id: VehicleId) => void;
  onSelectWeather: (weather: WeatherCondition) => void;
  onStart: () => void;
}

const WEATHER_OPTIONS: { id: WeatherCondition; label: string; icon: string }[] = [
  { id: 'clear', label: 'Clear Day', icon: '☀️' },
  { id: 'sunset', label: 'Golden Sunset', icon: '🌅' },
  { id: 'rain', label: 'Heavy Storm', icon: '🌧️' },
  { id: 'snow', label: 'Rocky Blizzard', icon: '❄️' },
  { id: 'fog', label: 'Coastal Fog', icon: '🌫️' },
  { id: 'night', label: 'Midnight Neon', icon: '🌙' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedHighwayId,
  selectedVehicleId,
  selectedWeather,
  onSelectHighway,
  onSelectVehicle,
  onSelectWeather,
  onStart,
}) => {
  const currentHighway = HIGHWAY_LIST.find((h) => h.id === selectedHighwayId) || HIGHWAY_LIST[0];
  const currentVehicle = VEHICLE_LIST.find((v) => v.id === selectedVehicleId) || VEHICLE_LIST[0];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-6 pointer-events-none select-none text-white">
      {/* Top Left: Bespoke Inline SVG Title Lockup */}
      <div className="flex flex-col items-start gap-1 max-w-lg pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Emblem Lockup */}
          <svg className="w-11 h-11 md:w-12 md:h-12 shrink-0" viewBox="0 0 100 100" fill="none">
            <path
              d="M 50 8 L 88 28 L 88 72 L 50 92 L 12 72 L 12 28 Z"
              fill="#0f172a"
              stroke="#ef4444"
              strokeWidth="4"
            />
            <path d="M 50 14 L 82 32 L 50 50 L 18 32 Z" fill="#ef4444" opacity="0.8" />
            <path d="M 50 50 L 82 68 L 50 86 L 18 68 Z" fill="#3b82f6" opacity="0.8" />
            <text x="50" y="56" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="sans-serif">
              USA
            </text>
          </svg>

          <div>
            <div className="text-[10px] md:text-xs uppercase tracking-widest text-red-500 font-extrabold flex items-center gap-1.5">
              <span>National Interstate Network</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              <span>Coast to Coast</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic drop-shadow-lg">
              Highway Racer 3D
            </h1>
          </div>
        </div>
      </div>

      {/* Middle-Left Asymmetric Interactive Deck */}
      <div className="w-full max-w-md pointer-events-auto flex flex-col gap-2 my-auto max-h-[78vh] overflow-y-auto pr-1">
        {/* Highway Selector Ribbon */}
        <div className="bg-slate-950/92 rounded-2xl border border-slate-700/80 p-2.5 shadow-2xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Select US Highway</span>
            <span className="text-[10px] text-amber-400 font-semibold truncate max-w-[210px]">{currentHighway.fromTo}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {HIGHWAY_LIST.map((h) => {
              const isSelected = h.id === selectedHighwayId;
              return (
                <button
                  key={h.id}
                  onClick={() => onSelectHighway(h.id)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-400 shadow-md ring-1 ring-blue-400/60'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <HighwayShield type={h.shieldType} number={h.routeNumber} className="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate text-white">{h.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{h.lanes} Lanes · {h.speedLimitMph} MPH</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lower: Car & Weather Selector */}
        <div className="flex flex-col gap-2">
          {/* Car Selector */}
          <div className="bg-slate-950/92 rounded-2xl border border-slate-700/80 p-2.5 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vehicle Model</span>
              <span className="text-[10px] font-mono text-red-400 font-bold">{currentVehicle.topSpeedMph} MPH TOP</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {VEHICLE_LIST.map((v) => {
                const isSelected = v.id === selectedVehicleId;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVehicle(v.id as VehicleId)}
                    className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-600/30 border-red-500 ring-1 ring-red-400/60'
                        : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-white truncate">{v.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{v.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weather Selector */}
          <div className="bg-slate-950/92 rounded-2xl border border-slate-700/80 p-2.5 shadow-xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Weather Conditions</div>
            <div className="grid grid-cols-3 gap-1.5">
              {WEATHER_OPTIONS.map((w) => {
                const isSelected = w.id === selectedWeather;
                return (
                  <button
                    key={w.id}
                    onClick={() => onSelectWeather(w.id)}
                    className={`p-1 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs">{w.icon}</div>
                    <div className="text-[9px] font-semibold truncate">{w.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          data-start="true"
          onClick={onStart}
          className="w-full py-3 px-6 rounded-2xl font-black text-base md:text-lg tracking-wider uppercase bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white shadow-2xl shadow-red-900/50 transition-all cursor-pointer border border-red-400/40 shrink-0"
        >
          Start Race (Enter / Space)
        </button>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="text-left md:text-center text-xs text-slate-300 font-mono tracking-wide bg-slate-950/92 px-4 py-2 rounded-xl border border-slate-800">
        <span className="text-amber-400 font-bold">CONTROLS:</span> 📱 <span className="text-emerald-400 font-bold">Phone Tilt</span> &amp; 👆 <span className="text-blue-400 font-bold">Swipe L/R</span> Steer · WASD / Arrows · <span className="text-orange-400 font-bold">Space / R</span> Rocket Thrusters (Fly) · <span className="text-cyan-400 font-bold">V</span> Vacuum Ceiling Mode · <span className="text-blue-300 font-bold">Shift</span> Nitro
      </div>
    </div>
  );
};

