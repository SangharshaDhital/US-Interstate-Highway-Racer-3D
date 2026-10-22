class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private tireScreechGain: GainNode | null = null;
  // Rocket Thruster & Vacuum Sound Nodes
  private thrusterGain: GainNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;
  private thrusterOsc: OscillatorNode | null = null;
  private vacuumGain: GainNode | null = null;
  private vacuumFilter: BiquadFilterNode | null = null;
  private vacuumOsc: OscillatorNode | null = null;
  private isRunning = false;
  private lastSonicBoomTime = 0;

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // 1. Engine sound synthesis (dual sawtooth + sub sine + distortion/lowpass)
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'sine';
    this.oscSub.frequency.setValueAtTime(27.5, this.ctx.currentTime);

    this.osc1.connect(this.engineFilter);
    this.osc2.connect(this.engineFilter);
    this.oscSub.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();
    this.oscSub.start();

    // 2. Wind noise (bandpass filtered white noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    whiteNoise.start();

    // 3. Tire screech noise
    const tireNoise = this.ctx.createBufferSource();
    tireNoise.buffer = noiseBuffer;
    tireNoise.loop = true;

    const tireFilter = this.ctx.createBiquadFilter();
    tireFilter.type = 'bandpass';
    tireFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    tireFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.tireScreechGain = this.ctx.createGain();
    this.tireScreechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    tireNoise.connect(tireFilter);
    tireFilter.connect(this.tireScreechGain);
    this.tireScreechGain.connect(this.ctx.destination);
    tireNoise.start();

    // 4. Rocket Thruster Sound (High energy resonant turbine + low roar)
    this.thrusterFilter = this.ctx.createBiquadFilter();
    this.thrusterFilter.type = 'lowpass';
    this.thrusterFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.thrusterFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.thrusterOsc = this.ctx.createOscillator();
    this.thrusterOsc.type = 'sawtooth';
    this.thrusterOsc.frequency.setValueAtTime(180, this.ctx.currentTime);

    this.thrusterOsc.connect(this.thrusterFilter);
    this.thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.ctx.destination);
    this.thrusterOsc.start();

    // 5. Vacuum Suction Sound (Electromagnetic turbine whine)
    this.vacuumFilter = this.ctx.createBiquadFilter();
    this.vacuumFilter.type = 'bandpass';
    this.vacuumFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
    this.vacuumFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.vacuumGain = this.ctx.createGain();
    this.vacuumGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.vacuumOsc = this.ctx.createOscillator();
    this.vacuumOsc.type = 'triangle';
    this.vacuumOsc.frequency.setValueAtTime(440, this.ctx.currentTime);

    this.vacuumOsc.connect(this.vacuumFilter);
    this.vacuumFilter.connect(this.vacuumGain);
    this.vacuumGain.connect(this.ctx.destination);
    this.vacuumOsc.start();

    this.isRunning = true;
  }

  public ensureUnlocked() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.windGain) this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.tireScreechGain) this.tireScreechGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.thrusterGain) this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.vacuumGain) this.vacuumGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateEngineSound(
    speedMph: number,
    rpm: number,
    isBoosting: boolean,
    isDrifting: boolean,
    isBraking: boolean,
    isFlying: boolean = false,
    isInverted: boolean = false,
    vacuumActive: boolean = false
  ) {
    if (this.isMuted || !this.ctx || !this.isRunning) return;

    const t = this.ctx.currentTime;

    // RPM pitch modulation
    const baseFreq = 45 + rpm * 140 + (isBoosting ? 30 : 0);
    this.osc1?.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.osc2?.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.05);
    this.oscSub?.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    // Engine filter cutoff rises with rpm
    const cutoff = 250 + rpm * 1200 + (isBoosting ? 600 : 0);
    this.engineFilter?.frequency.setTargetAtTime(cutoff, t, 0.05);

    // Engine volume
    const targetEngineVol = 0.18 + rpm * 0.14 + (isBoosting ? 0.08 : 0);
    this.engineGain?.gain.setTargetAtTime(targetEngineVol, t, 0.08);

    // Wind roar & turbulence proportional to speed
    const windVol = Math.min(0.35, (speedMph / 190) ** 1.6 * 0.35);
    this.windGain?.gain.setTargetAtTime(windVol, t, 0.08);
    this.windFilter?.frequency.setTargetAtTime(350 + speedMph * 8.5, t, 0.08);

    // Tire screech when drifting or heavy braking at speed (only on road ground)
    const shouldScreech = !isFlying && ((isDrifting && speedMph > 35) || (isBraking && speedMph > 60));
    const screechVol = shouldScreech ? (isDrifting ? 0.22 : 0.16) : 0;
    this.tireScreechGain?.gain.setTargetAtTime(screechVol, t, 0.06);

    // Rocket Thruster Sound
    if (isFlying) {
      this.thrusterGain?.gain.setTargetAtTime(0.32, t, 0.05);
      this.thrusterFilter?.frequency.setTargetAtTime(1100 + (speedMph / 250) * 800, t, 0.05);
      this.thrusterOsc?.frequency.setTargetAtTime(220 + (speedMph / 250) * 160, t, 0.05);
    } else {
      this.thrusterGain?.gain.setTargetAtTime(0, t, 0.08);
    }

    // Vacuum Inverted Suction Sound
    if (isInverted || vacuumActive) {
      const vacVol = isInverted ? 0.25 : 0.12;
      this.vacuumGain?.gain.setTargetAtTime(vacVol, t, 0.06);
      this.vacuumFilter?.frequency.setTargetAtTime(isInverted ? 1200 : 850, t, 0.06);
      this.vacuumOsc?.frequency.setTargetAtTime(isInverted ? 520 : 380, t, 0.06);
    } else {
      this.vacuumGain?.gain.setTargetAtTime(0, t, 0.1);
    }

    // Trigger sonic boom shockwave sound when breaking 200 mph
    if (speedMph > 200 && t - this.lastSonicBoomTime > 8) {
      this.lastSonicBoomTime = t;
      this.playSonicBoom();
    }
  }

  public playSonicBoom() {
    if (this.isMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.46);
  }

  public pauseSounds() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain?.gain.setTargetAtTime(0, t, 0.05);
    this.windGain?.gain.setTargetAtTime(0, t, 0.05);
    this.tireScreechGain?.gain.setTargetAtTime(0, t, 0.05);
    this.thrusterGain?.gain.setTargetAtTime(0, t, 0.05);
    this.vacuumGain?.gain.setTargetAtTime(0, t, 0.05);
  }

  public playNearMissWhoosh() {
    if (this.isMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    // Doppler whoosh: high -> low
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.35);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  public playNitroBoost() {
    if (this.isMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  public playCrashImpact() {
    if (this.isMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy low frequency boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    subGain.gain.setValueAtTime(0.45, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.46);

    // Crunch metal noise
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(850, t);
    noiseFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  public playUiClick() {
    if (this.isMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.65);
    });
  }
}

export const soundEngine = new SoundEngine();
