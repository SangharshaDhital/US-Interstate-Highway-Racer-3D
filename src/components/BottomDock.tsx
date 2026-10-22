import React, { useState } from 'react';
import { HIGHWAY_LIST } from '../game/highways.ts';
import { CameraView, HighwayId, TrafficDensity, WeatherCondition } from '../game/types.ts';

interface BottomDockProps {
  currentHighwayId: HighwayId;
  currentWeather: WeatherCondition;
  currentTrafficDensity: TrafficDensity;
  currentCameraView: CameraView;
  onSelectHighway: (id: HighwayId) => void;
  onSelectWeather: (weather: WeatherCondition) => void;
  onSelectTrafficDensity: (density: TrafficDensity) => void;
  onSelectCameraView: (view: CameraView) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  currentHighwayId,
  currentWeather,
  currentTrafficDensity,
  currentCameraView,
  onSelectHighway,
  onSelectWeather,
  onSelectTrafficDensity,
  onSelectCameraView,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<'highway' | 'weather' | 'traffic' | 'camera'>('highway');

  return (
    <div
      className="fixed z-30 transition-transform duration-300 pointer-events-auto"
      style={{
        bottom: '0px',
        left: '50%',
        transform: isCollapsed
          ? 'translateX(-50%) translateY(calc(100% - 32px))'
          : 'translateX(-50%) translateY(0)',
        maxWidth: 'min(940px, 94vw)',
        width: '100%',
      }}
    >
      {/* Collapse / Expand Tab Toggle */}
      <div className="flex justify-center mb-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-t-xl px-5 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
        >
          <span>{isCollapsed ? '▴ Show Highway Controls' : '▾ Hide Controls'}</span>
          <span className="text-[10px] font-mono text-slate-500">(H)</span>
        </button>
      </div>

      {/* Dock Container */}
      <div className="bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 backdrop-none">
        {/* Dock Tab Headers */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'highway', label: 'Route' },
                { id: 'weather', label: 'Weather' },
                { id: 'traffic', label: 'Traffic' },
                { id: 'camera', label: 'Camera' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            Cross-Country Simulation
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[50px] flex items-center">
          {activeTab === 'highway' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              {HIGHWAY_LIST.map((h) => (
                <button
                  key={h.id}
                  onClick={() => onSelectHighway(h.id)}
                  className={`px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                    h.id === currentHighwayId
                      ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{h.name}</div>
                  <div className="text-[10px] opacity-75 truncate">{h.fromTo}</div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
              {(
                [
                  { id: 'clear', label: '☀️ Clear Day' },
                  { id: 'sunset', label: '🌅 Sunset' },
                  { id: 'rain', label: '🌧️ Storm Rain' },
                  { id: 'snow', label: '❄️ Snow Blizzard' },
                  { id: 'fog', label: '🌫️ Coastal Fog' },
                  { id: 'night', label: '🌙 Midnight' },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  onClick={() => onSelectWeather(w.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                    currentWeather === w.id
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="grid grid-cols-4 gap-2 w-full">
              {(
                [
                  { id: 'light', label: 'Light Cruise', desc: 'Sparse open lanes' },
                  { id: 'moderate', label: 'Moderate', desc: 'Balanced traffic' },
                  { id: 'heavy', label: 'Heavy Haul', desc: 'Convoys & weaving' },
                  { id: 'rush_hour', label: 'Rush Hour', desc: 'Dense gridlock challenge' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelectTrafficDensity(d.id)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    currentTrafficDensity === d.id
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">{d.label}</div>
                  <div className="text-[10px] opacity-75">{d.desc}</div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="grid grid-cols-3 gap-2 w-full">
              {(
                [
                  { id: 'chase', label: 'Chase Camera', desc: 'Dynamic dynamic angle' },
                  { id: 'hood', label: 'Hood Camera', desc: 'Looking over the scoop' },
                  { id: 'bumper', label: 'Bumper Camera', desc: 'High-speed ground view' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCameraView(c.id)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    currentCameraView === c.id
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">{c.label}</div>
                  <div className="text-[10px] opacity-75">{c.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
