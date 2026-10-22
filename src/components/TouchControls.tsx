import React, { useEffect, useRef, useState } from 'react';
import { computeSwipeSteerAxis, computeTiltSteerAxis } from '../game/physics.ts';
import { InputState } from '../game/types.ts';

interface TouchControlsProps {
  inputs: InputState;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ inputs }) => {
  // Tilt mode is active by default so tilting the phone works immediately,
  // while keeping Swipe Left/Right mode always open simultaneously.
  const [tiltEnabled, setTiltEnabled] = useState<boolean>(true);
  const [tiltPermissionState, setTiltPermissionState] = useState<'granted' | 'prompt' | 'unsupported'>('granted');
  const [autoGas, setAutoGas] = useState<boolean>(false);

  // Live visual feedback for active tilt or swipe steering (-1 to +1)
  const [liveSteerIndicator, setLiveSteerIndicator] = useState<number>(0);
  const [activeControlSource, setActiveControlSource] = useState<'idle' | 'tilt' | 'swipe'>('idle');

  // Calibration offset for phone tilt
  const calibrationOffsetRef = useRef<number>(0);
  const latestRawAngleRef = useRef<number>(0);

  // Swipe tracking refs
  const swipeActiveRef = useRef<boolean>(false);
  const swipeStartXRef = useRef<number>(0);
  const swipeLastXRef = useRef<number>(0);
  const swipeLastTimeRef = useRef<number>(0);
  const swipeVelocityRef = useRef<number>(0);
  const decayFrameRef = useRef<number | null>(null);

  // Sync autoThrottle flag into engine inputs
  useEffect(() => {
    inputs.autoThrottle = autoGas;
  }, [autoGas, inputs]);

  // Check if iOS 13+ requires explicit DeviceOrientationEvent permission
  useEffect(() => {
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      setTiltPermissionState('unsupported');
      return;
    }
    const devOrient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof devOrient.requestPermission === 'function') {
      setTiltPermissionState('prompt');
    } else {
      setTiltPermissionState('granted');
    }
  }, []);

  // Phone Tilt (DeviceOrientation) listener
  useEffect(() => {
    if (!tiltEnabled) {
      inputs.tiltSteer = 0;
      return;
    }

    const getOrientationAngle = (): number => {
      if (typeof window.screen !== 'undefined' && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
        return window.screen.orientation.angle;
      }
      if (typeof (window as unknown as { orientation?: number }).orientation === 'number') {
        return (window as unknown as { orientation: number }).orientation;
      }
      return window.innerWidth > window.innerHeight ? 90 : 0;
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null && e.beta === null) return;
      const orientAngle = getOrientationAngle();

      // Track raw angle for one-tap center calibration
      const normOrient = ((orientAngle % 360) + 360) % 360;
      const rawDeg =
        normOrient === 90
          ? (e.beta ?? 0)
          : normOrient === 270
          ? -(e.beta ?? 0)
          : normOrient === 180
          ? -(e.gamma ?? 0)
          : (e.gamma ?? 0);
      latestRawAngleRef.current = rawDeg;

      const axis = computeTiltSteerAxis(
        e.gamma,
        e.beta,
        orientAngle,
        calibrationOffsetRef.current
      );
      inputs.tiltSteer = axis;

      if (!swipeActiveRef.current) {
        setLiveSteerIndicator(axis);
        setActiveControlSource(Math.abs(axis) > 0.05 ? 'tilt' : 'idle');
      }
    };

    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      inputs.tiltSteer = 0;
    };
  }, [tiltEnabled, inputs]);

  // Toggle or Request Permission + Calibrate Tilt
  const handleToggleOrCalibrateTilt = async () => {
    const devOrient =
      typeof DeviceOrientationEvent !== 'undefined'
        ? (DeviceOrientationEvent as unknown as {
            requestPermission?: () => Promise<'granted' | 'denied'>;
          })
        : null;

    if (devOrient && typeof devOrient.requestPermission === 'function' && tiltPermissionState === 'prompt') {
      try {
        const res = await devOrient.requestPermission();
        if (res === 'granted') {
          setTiltPermissionState('granted');
          setTiltEnabled(true);
          calibrationOffsetRef.current = latestRawAngleRef.current;
          return;
        }
      } catch {
        // Fallback if permission dialog fails in desktop/iframe preview
        setTiltPermissionState('granted');
      }
    }

    if (!tiltEnabled) {
      calibrationOffsetRef.current = latestRawAngleRef.current;
      setTiltEnabled(true);
    } else {
      setTiltEnabled(false);
      inputs.tiltSteer = 0;
      if (activeControlSource === 'tilt') {
        setLiveSteerIndicator(0);
        setActiveControlSource('idle');
      }
    }
  };

  const handleRecenterTilt = () => {
    calibrationOffsetRef.current = latestRawAngleRef.current;
    inputs.tiltSteer = 0;
    setLiveSteerIndicator(0);
  };

  // Cancel any decaying flick impulse
  const stopSwipeDecay = () => {
    if (decayFrameRef.current !== null) {
      cancelAnimationFrame(decayFrameRef.current);
      decayFrameRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopSwipeDecay();
  }, []);

  // Start Swipe Left/Right Gesture
  const beginSwipe = (clientX: number) => {
    stopSwipeDecay();
    swipeActiveRef.current = true;
    swipeStartXRef.current = clientX;
    swipeLastXRef.current = clientX;
    swipeLastTimeRef.current = performance.now();
    swipeVelocityRef.current = 0;
  };

  // Update Swipe Left/Right Gesture (supports both continuous drag & fast flicks)
  const moveSwipe = (clientX: number) => {
    if (!swipeActiveRef.current) return;
    const now = performance.now();
    const dtMs = Math.max(1, now - swipeLastTimeRef.current);
    const stepDx = clientX - swipeLastXRef.current;
    const totalDx = clientX - swipeStartXRef.current;

    // Instantaneous horizontal swipe velocity (pixels per ms)
    const vx = stepDx / dtMs;
    swipeVelocityRef.current = swipeVelocityRef.current * 0.5 + vx * 0.5;

    // Combine total displacement from touch anchor + quick directional velocity boost
    const effectiveDx = totalDx + swipeVelocityRef.current * 45;
    const axis = computeSwipeSteerAxis(effectiveDx, window.innerWidth);

    // If user reverses direction mid-drag, smoothly shift anchor so re-steering opposite is instant
    if (Math.sign(stepDx) !== 0 && Math.sign(stepDx) !== Math.sign(totalDx) && Math.abs(totalDx) > 55) {
      swipeStartXRef.current = clientX - Math.sign(totalDx) * 45;
    }

    swipeLastXRef.current = clientX;
    swipeLastTimeRef.current = now;

    inputs.swipeSteer = axis;
    setLiveSteerIndicator(axis);
    setActiveControlSource(Math.abs(axis) > 0.03 ? 'swipe' : 'idle');
  };

  // End Swipe Left/Right Gesture (smoothly decays flick momentum for quick lane changes)
  const endSwipe = () => {
    if (!swipeActiveRef.current) return;
    swipeActiveRef.current = false;

    const releaseAxis = inputs.swipeSteer ?? 0;
    const releaseVx = swipeVelocityRef.current;

    // If user performed a quick left/right flick, sustain lane-change impulse smoothly for ~260ms
    let momentumAxis =
      Math.abs(releaseVx) > 0.35
        ? Math.max(-1, Math.min(1, Math.sign(releaseVx) * Math.min(1, Math.abs(releaseVx) * 0.9)))
        : releaseAxis * 0.65;

    const decayLoop = () => {
      momentumAxis *= 0.82;
      if (Math.abs(momentumAxis) < 0.03) {
        inputs.swipeSteer = 0;
        const fallbackTilt = inputs.tiltSteer ?? 0;
        setLiveSteerIndicator(fallbackTilt);
        setActiveControlSource(Math.abs(fallbackTilt) > 0.05 ? 'tilt' : 'idle');
        decayFrameRef.current = null;
        return;
      }
      inputs.swipeSteer = Number(momentumAxis.toFixed(4));
      setLiveSteerIndicator(inputs.swipeSteer);
      setActiveControlSource('swipe');
      decayFrameRef.current = requestAnimationFrame(decayLoop);
    };

    decayFrameRef.current = requestAnimationFrame(decayLoop);
  };

  const steerPercent = Math.round(liveSteerIndicator * 100);

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3">
      {/* Full-Screen Open Swipe Left/Right Touch & Pointer Gesture Layer */}
      <div
        data-testid="swipe-steering-zone"
        aria-label="Swipe Left or Right Steering Zone"
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            beginSwipe(e.touches[0].clientX);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            moveSwipe(e.touches[0].clientX);
          }
        }}
        onTouchEnd={endSwipe}
        onTouchCancel={endSwipe}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          beginSwipe(e.clientX);
        }}
        onPointerMove={(e) => {
          moveSwipe(e.clientX);
        }}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        className="absolute inset-0 pointer-events-auto touch-pan-y z-0"
      />

      {/* Top-Center Tilt & Swipe Steering Mode Bar + Live Steering Gauge */}
      <div className="relative z-10 self-center mt-16 md:mt-1.5 flex flex-col items-center gap-1.5 pointer-events-auto max-w-full">
        <div className="flex items-center gap-1 md:gap-1.5 bg-slate-950/92 border border-slate-700/90 rounded-2xl px-2 py-1 md:px-2.5 md:py-1.5 shadow-xl">
          {/* Phone Tilt Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleOrCalibrateTilt}
            aria-label={tiltEnabled ? 'Disable Phone Tilt Steering' : 'Enable Phone Tilt Steering'}
            className={`px-2 md:px-2.5 py-1 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer whitespace-nowrap ${
              tiltEnabled
                ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>{tiltEnabled ? 'Tilt: ON' : 'Tilt: OFF'}</span>
          </button>

          {/* Re-center Tilt Calibration Button */}
          {tiltEnabled && (
            <button
              type="button"
              onClick={handleRecenterTilt}
              aria-label="Calibrate Tilt Center"
              title="Set current phone angle as center"
              className="px-2 py-1 rounded-xl text-[10px] font-mono font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer whitespace-nowrap"
            >
              🎯 Center
            </button>
          )}

          {/* Always-Open Swipe Left/Right Status Badge */}
          <div
            className={`px-2 md:px-2.5 py-1 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 border whitespace-nowrap ${
              activeControlSource === 'swipe'
                ? 'bg-blue-600/40 border-blue-400 text-blue-200'
                : 'bg-slate-900/90 border-blue-500/40 text-blue-300'
            }`}
          >
            <span>👆</span>
            <span>Swipe L/R</span>
          </div>

          {/* One-Handed Auto-Gas Cruise Toggle */}
          <button
            type="button"
            onClick={() => setAutoGas((prev) => !prev)}
            aria-label={autoGas ? 'Disable Auto Gas' : 'Enable Auto Gas'}
            className={`px-2 md:px-2.5 py-1 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer whitespace-nowrap ${
              autoGas
                ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>⚡</span>
            <span>Auto-Gas: {autoGas ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Live Analog Tilt / Swipe Steering Bar Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/92 border border-slate-800/90 px-3 py-1 rounded-full shadow-lg">
          <span className="text-[10px] font-mono font-bold text-slate-400">◀ L</span>
          <div className="relative w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            {/* Center tick */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-500 -translate-x-1/2 z-10" />
            {/* Proportional steer bar from center */}
            <div
              className={`absolute top-0 bottom-0 transition-all duration-75 ${
                activeControlSource === 'swipe'
                  ? 'bg-blue-400'
                  : activeControlSource === 'tilt'
                  ? 'bg-emerald-400'
                  : 'bg-slate-500'
              }`}
              style={{
                left: liveSteerIndicator < 0 ? `${50 + liveSteerIndicator * 50}%` : '50%',
                width: `${Math.abs(liveSteerIndicator) * 50}%`,
              }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">R ▶</span>
          {Math.abs(steerPercent) > 3 && (
            <span className="text-[10px] font-mono font-extrabold text-cyan-300 min-w-[44px] text-right">
              {steerPercent > 0 ? `R +${steerPercent}%` : `L ${steerPercent}%`}
            </span>
          )}
        </div>
      </div>

      {/* Bottom On-Screen Touch Pedals & Steer Buttons (Mobile & Tablet) */}
      <div className="relative z-10 flex justify-between items-end w-full pb-2 lg:hidden">
        {/* Left Side: Steer Left / Right & Flight / Vacuum triggers */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Action Row: Vacuum & Thrusters */}
          <div className="flex gap-2">
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.vacuumToggleJustPressed = true;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.vacuumToggleJustPressed = true;
              }}
              aria-label="Vacuum Inverted Mode"
              className="px-3 h-11 rounded-xl bg-cyan-900/85 active:bg-cyan-600 border border-cyan-400 text-white font-bold text-xs select-none shadow-lg flex items-center gap-1.5"
            >
              <span>🧲</span>
              <span>VAC [V]</span>
            </button>
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.thruster = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.thruster = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.thruster = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.thruster = false;
              }}
              aria-label="Rocket Thruster Flight"
              className="px-3 h-11 rounded-xl bg-orange-700/85 active:bg-orange-500 border border-orange-400 text-white font-bold text-xs select-none shadow-lg flex items-center gap-1.5"
            >
              <span>🚀</span>
              <span>FLY [R]</span>
            </button>
          </div>

          {/* Steer Row */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.left = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.left = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.left = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.left = false;
              }}
              aria-label="Steer Left"
              className="w-16 h-16 rounded-2xl bg-slate-900/85 active:bg-blue-600/80 border border-slate-700 active:border-blue-400 text-white flex items-center justify-center font-black text-2xl select-none shadow-xl"
            >
              ◀
            </button>
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.right = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.right = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.right = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.right = false;
              }}
              aria-label="Steer Right"
              className="w-16 h-16 rounded-2xl bg-slate-900/85 active:bg-blue-600/80 border border-slate-700 active:border-blue-400 text-white flex items-center justify-center font-black text-2xl select-none shadow-xl"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Right Side: Drift, Boost, Brake, Throttle */}
        <div className="flex items-end gap-2.5 pointer-events-auto">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.drift = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.drift = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.drift = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.drift = false;
              }}
              aria-label="Drift"
              className="w-13 h-13 rounded-2xl bg-amber-600/75 active:bg-amber-500 border border-amber-400 text-white font-bold text-xs select-none shadow-lg flex items-center justify-center"
            >
              DRIFT
            </button>
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.boost = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.boost = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.boost = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.boost = false;
              }}
              aria-label="Nitro Boost"
              className="w-13 h-13 rounded-2xl bg-cyan-600/85 active:bg-cyan-400 border border-cyan-400 text-white font-bold text-xs select-none shadow-lg flex items-center justify-center"
            >
              NITRO
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.forward = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.forward = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.forward = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.forward = false;
              }}
              aria-label="Accelerate Gas"
              className="w-16 h-20 rounded-2xl bg-emerald-600/85 active:bg-emerald-500 border border-emerald-400 text-white font-black text-sm select-none shadow-xl flex items-center justify-center"
            >
              GAS ▲
            </button>
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.backward = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                inputs.backward = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                inputs.backward = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                inputs.backward = false;
              }}
              aria-label="Brake Reverse"
              className="w-16 h-12 rounded-xl bg-red-600/85 active:bg-red-500 border border-red-400 text-white font-black text-xs select-none shadow-xl flex items-center justify-center"
            >
              BRAKE ▼
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
