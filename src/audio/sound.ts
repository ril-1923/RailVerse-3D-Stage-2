/**
 * Lightweight Web Audio synthesized railway sounds — no external assets.
 * Disabled by default; enabled via toggle in the settings panel.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private enabled = false;
  private volume = 0.5;

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.ensure();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    if (this.master) {
      this.master.gain.linearRampToValueAtTime(
        on ? this.volume : 0,
        this.ctx!.currentTime + 0.3,
      );
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.enabled) {
      this.master.gain.linearRampToValueAtTime(v, this.ctx!.currentTime + 0.1);
    }
  }

  /** Continuous engine hum whose pitch tracks train speed. */
  startEngine() {
    this.ensure();
    if (!this.ctx || !this.master || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 45;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 220;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.05;
    this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
  }

  setEngineSpeed(kmh: number) {
    if (!this.engineOsc || !this.ctx) return;
    const target = 40 + kmh * 0.9;
    this.engineOsc.frequency.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
    if (this.engineFilter) {
      this.engineFilter.frequency.linearRampToValueAtTime(200 + kmh * 4, this.ctx.currentTime + 0.4);
    }
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
      } catch { /* already stopped */ }
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain = 0.15) {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  horn() {
    this.ensure();
    if (!this.ctx || !this.master) return;
    for (const f of [311, 370, 466]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.06, this.ctx.currentTime);
      g.gain.setValueAtTime(0.06, this.ctx.currentTime + 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.75);
      osc.connect(g).connect(this.master);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.75);
    }
  }

  doorChime() {
    this.blip(880, 0.25, 'sine');
    setTimeout(() => this.blip(660, 0.3, 'sine'), 180);
  }

  departureBell() {
    this.blip(1046, 0.18, 'triangle');
    setTimeout(() => this.blip(1046, 0.18, 'triangle'), 220);
    setTimeout(() => this.blip(1318, 0.3, 'triangle'), 440);
  }

  announcementChime() {
    this.blip(523, 0.2, 'sine', 0.12);
    setTimeout(() => this.blip(659, 0.2, 'sine', 0.12), 150);
    setTimeout(() => this.blip(784, 0.35, 'sine', 0.12), 300);
  }

  signalBeep(aspect: 'green' | 'yellow' | 'red') {
    if (aspect === 'red') this.blip(220, 0.3, 'square', 0.05);
    else if (aspect === 'yellow') this.blip(440, 0.15, 'square', 0.04);
  }

  dispose() {
    this.stopEngine();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}

export const soundEngine = new SoundEngine();
