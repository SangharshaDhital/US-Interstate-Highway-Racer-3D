import React from 'react';
import { GameState, HighwayConfig, PlayerCarState } from '../game/types.ts';

interface StatusModalsProps {
  gameState: GameState;
  isVictory: boolean;
  playerState: PlayerCarState;
  highway: HighwayConfig;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  gameState,
  isVictory,
  playerState,
  highway,
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  if (gameState !== 'paused' && gameState !== 'gameover') {
    return null;
  }

  const distanceMiles = (playerState.totalDistanceMeters * 0.000621371).toFixed(2);
  const topSpeed = Math.round(playerState.speedMph);

  if (gameState === 'paused') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 pointer-events-auto select-none">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center text-white">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </div>

          <h2 className="text-2xl font-black uppercase tracking-wider mb-1">Race Paused</h2>
          <p className="text-sm text-slate-400 mb-6">{highway.name}</p>

          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Distance</div>
              <div className="text-xl font-mono font-bold text-white tabular-nums">{distanceMiles} MI</div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
              <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">
                {playerState.score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={onResume}
              className="w-full py-3 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-lg shadow-blue-900/40"
            >
              Resume (Esc / P)
            </button>
            <button
              onClick={onRestart}
              className="w-full py-3 px-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              Restart Route
            </button>
            <button
              onClick={onReturnToTitle}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Return to Route Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over (Victory or Defeat)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col items-center text-center text-white">
        {/* Victory or Defeat Icon */}
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 shadow-xl ${
            isVictory
              ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-300'
              : 'bg-red-500/20 border-2 border-red-500 text-red-400'
          }`}
        >
          {isVictory ? (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
              <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        <h2 className="text-3xl font-black uppercase tracking-tight mb-1">
          {isVictory ? 'Checkpoint Reached!' : 'Vehicle Totaled!'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isVictory ? `Successfully conquered ${highway.name}` : `Crash sustained on ${highway.name}`}
        </p>

        {/* Tabular Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mb-6">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Distance</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">{distanceMiles} MI</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Top Speed</div>
            <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">{topSpeed} MPH</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Near Misses</div>
            <div className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{playerState.nearMissCount}</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Final Score</div>
            <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">
              {playerState.score.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            data-start="true"
            onClick={onRestart}
            className="flex-1 py-3.5 px-6 rounded-2xl font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-xl shadow-red-900/50 transition-all cursor-pointer"
          >
            {isVictory ? 'Play Again (Enter)' : 'Try Again (Enter)'}
          </button>
          <button
            onClick={onReturnToTitle}
            className="py-3.5 px-6 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          >
            Select Highway
          </button>
        </div>
      </div>
    </div>
  );
};
