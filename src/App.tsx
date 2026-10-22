/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from './game/audio.ts';
import { GameEngine } from './game/engine.ts';
import { HIGHWAYS } from './game/highways.ts';
import { createInitialPlayerState } from './game/physics.ts';
import {
  CameraView,
  GameState,
  HighwayConfig,
  HighwayId,
  PlayerCarState,
  TrafficDensity,
  VehicleId,
  WeatherCondition,
} from './game/types.ts';
import { BottomDock } from './components/BottomDock.tsx';
import { GameHud } from './components/GameHud.tsx';
import { SpeedEffectsOverlay } from './components/SpeedEffectsOverlay.tsx';
import { StatusModals } from './components/StatusModals.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { TouchControls } from './components/TouchControls.tsx';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level game state
  const [gameState, setGameState] = useState<GameState>('title');
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Configuration selections
  const [selectedHighwayId, setSelectedHighwayId] = useState<HighwayId>('route-66');
  const [selectedVehicleId, setSelectedVehicleId] = useState<VehicleId>('muscle');
  const [selectedWeather, setSelectedWeather] = useState<WeatherCondition>('sunset');
  const [trafficDensity, setTrafficDensity] = useState<TrafficDensity>('moderate');
  const [cameraView, setCameraView] = useState<CameraView>('chase');

  // Throttled HUD state from engine (updated at <= 10Hz)
  const [playerState, setPlayerState] = useState<PlayerCarState>(createInitialPlayerState());
  const [currentHighway, setCurrentHighway] = useState<HighwayConfig>(HIGHWAYS['route-66']);

  useEffect(() => {
    if (!mountRef.current) return;

    // Check for autostart and deep-link URL params
    const searchParams = new URLSearchParams(window.location.search);
    const shouldAutostart = searchParams.get('autostart') === '1';
    const paramHighway = (searchParams.get('highway') as HighwayId) || selectedHighwayId;
    const paramVehicle = (searchParams.get('vehicle') as VehicleId) || selectedVehicleId;
    const paramWeather = (searchParams.get('weather') as WeatherCondition) || selectedWeather;

    const engine = new GameEngine(
      mountRef.current,
      paramHighway,
      paramVehicle,
      paramWeather,
      (player, highway, weather) => {
        setPlayerState({ ...player });
        setCurrentHighway(highway);
        setSelectedWeather(weather);
      },
      (won, finalStats) => {
        setIsVictory(won);
        setGameState('gameover');
        setPlayerState({ ...finalStats });
      }
    );

    engineRef.current = engine;
    (window as unknown as { __GAME_ENGINE__?: GameEngine }).__GAME_ENGINE__ = engine;

    if (shouldAutostart) {
      engine.startGame();
      setGameState('playing');
    }

    // Keyboard controls
    const heldKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      heldKeys.add(e.code);

      // Edge triggers
      if (e.code === 'KeyM') {
        const muted = soundEngine.toggleMute();
        setIsMuted(muted);
      }
      if (e.code === 'KeyC') {
        engine.inputs.cameraToggleJustPressed = true;
      }
      if (e.code === 'KeyL') {
        engine.inputs.headlightsToggleJustPressed = true;
      }
      if (e.code === 'KeyV') {
        engine.inputs.vacuumToggleJustPressed = true;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (engine.gameState === 'playing') {
          engine.pauseGame();
          setGameState('paused');
        } else if (engine.gameState === 'paused') {
          engine.resumeGame();
          setGameState('playing');
        }
      }
      if (e.code === 'Enter' || (e.code === 'Space' && engine.gameState === 'title')) {
        if (engine.gameState === 'title' || engine.gameState === 'gameover') {
          engine.startGame();
          setGameState('playing');
        }
      }

      // Continuous keys
      engine.inputs.forward = heldKeys.has('KeyW') || heldKeys.has('ArrowUp');
      engine.inputs.backward = heldKeys.has('KeyS') || heldKeys.has('ArrowDown');
      engine.inputs.left = heldKeys.has('KeyA') || heldKeys.has('ArrowLeft');
      engine.inputs.right = heldKeys.has('KeyD') || heldKeys.has('ArrowRight');
      engine.inputs.drift = heldKeys.has('KeyE');
      engine.inputs.boost = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight');
      engine.inputs.thruster =
        heldKeys.has('KeyR') ||
        heldKeys.has('KeyF') ||
        heldKeys.has('KeyT') ||
        (heldKeys.has('Space') && engine.gameState === 'playing');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
      engine.inputs.forward = heldKeys.has('KeyW') || heldKeys.has('ArrowUp');
      engine.inputs.backward = heldKeys.has('KeyS') || heldKeys.has('ArrowDown');
      engine.inputs.left = heldKeys.has('KeyA') || heldKeys.has('ArrowLeft');
      engine.inputs.right = heldKeys.has('KeyD') || heldKeys.has('ArrowRight');
      engine.inputs.drift = heldKeys.has('KeyE');
      engine.inputs.boost = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight');
      engine.inputs.thruster =
        heldKeys.has('KeyR') ||
        heldKeys.has('KeyF') ||
        heldKeys.has('KeyT') ||
        (heldKeys.has('Space') && engine.gameState === 'playing');
    };

    const handleBlur = () => {
      heldKeys.clear();
      engine.inputs.forward = false;
      engine.inputs.backward = false;
      engine.inputs.left = false;
      engine.inputs.right = false;
      engine.inputs.drift = false;
      engine.inputs.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
      engine.dispose();
    };
  }, []);

  const handleStart = () => {
    if (!engineRef.current) return;
    engineRef.current.startGame();
    setGameState('playing');
  };

  const handleResume = () => {
    if (!engineRef.current) return;
    engineRef.current.resumeGame();
    setGameState('playing');
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.restartGame();
    setGameState('playing');
  };

  const handleReturnToTitle = () => {
    if (!engineRef.current) return;
    engineRef.current.returnToTitle();
    setGameState('title');
  };

  const handleSelectHighway = (id: HighwayId) => {
    setSelectedHighwayId(id);
    if (engineRef.current) {
      engineRef.current.setHighway(id);
    }
  };

  const handleSelectVehicle = (id: VehicleId) => {
    setSelectedVehicleId(id);
    if (engineRef.current) {
      engineRef.current.setVehicle(id);
    }
  };

  const handleSelectWeather = (weather: WeatherCondition) => {
    setSelectedWeather(weather);
    if (engineRef.current) {
      engineRef.current.setWeather(weather);
    }
  };

  const handleSelectTrafficDensity = (density: TrafficDensity) => {
    setTrafficDensity(density);
    if (engineRef.current) {
      engineRef.current.setTrafficDensity(density);
    }
  };

  const handleSelectCameraView = (view: CameraView) => {
    setCameraView(view);
    if (engineRef.current) {
      engineRef.current.setCameraView(view);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Isolated Three.js WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          selectedHighwayId={selectedHighwayId}
          selectedVehicleId={selectedVehicleId}
          selectedWeather={selectedWeather}
          onSelectHighway={handleSelectHighway}
          onSelectVehicle={handleSelectVehicle}
          onSelectWeather={handleSelectWeather}
          onStart={handleStart}
        />
      )}

      {/* Active In-Game HUD */}
      {gameState === 'playing' && (
        <>
          {/* High-speed wind tunnel & nitro warp overlay */}
          <SpeedEffectsOverlay playerState={playerState} />

          <GameHud
            playerState={playerState}
            highway={currentHighway}
            weather={selectedWeather}
            cameraView={cameraView}
            isMuted={isMuted}
            onToggleMute={() => {
              const muted = soundEngine.toggleMute();
              setIsMuted(muted);
            }}
            onToggleCamera={() => {
              const nextCam: CameraView =
                cameraView === 'chase' ? 'hood' : cameraView === 'hood' ? 'bumper' : 'chase';
              handleSelectCameraView(nextCam);
            }}
            onToggleHeadlights={() => {
              if (engineRef.current) {
                engineRef.current.inputs.headlightsToggleJustPressed = true;
              }
            }}
            onPause={() => {
              if (engineRef.current) {
                engineRef.current.pauseGame();
                setGameState('paused');
              }
            }}
            onTriggerThruster={(active) => {
              if (engineRef.current) {
                engineRef.current.inputs.thruster = active;
              }
            }}
            onToggleVacuum={() => {
              if (engineRef.current) {
                engineRef.current.inputs.vacuumToggleJustPressed = true;
              }
            }}
          />

          {/* Touch controls for mobile viewports */}
          {engineRef.current && <TouchControls inputs={engineRef.current.inputs} />}

          {/* Collapsible Bottom Control Dock */}
          <BottomDock
            currentHighwayId={selectedHighwayId}
            currentWeather={selectedWeather}
            currentTrafficDensity={trafficDensity}
            currentCameraView={cameraView}
            onSelectHighway={handleSelectHighway}
            onSelectWeather={handleSelectWeather}
            onSelectTrafficDensity={handleSelectTrafficDensity}
            onSelectCameraView={handleSelectCameraView}
          />
        </>
      )}

      {/* Paused, Victory & Game Over Modals */}
      <StatusModals
        gameState={gameState}
        isVictory={isVictory}
        playerState={playerState}
        highway={currentHighway}
        onResume={handleResume}
        onRestart={handleRestart}
        onReturnToTitle={handleReturnToTitle}
      />
    </div>
  );
}
