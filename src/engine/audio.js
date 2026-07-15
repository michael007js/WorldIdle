/**
 * engine/audio.js — WebAudio 音效（可选，默认静音）
 * 不引入外部音频文件，使用合成 tone。
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.5;
  }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext unavailable', e);
    }
  }
  setEnabled(v) { this.enabled = v; if (v) this.init(); }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); }
  beep(freq, dur = 0.06, type = 'sine', gain = 0.05) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + dur);
  }
  click() { this.beep(660, 0.04, 'square', 0.04); }
  place() { this.beep(440, 0.08, 'triangle', 0.05); this.beep(660, 0.06, 'triangle', 0.04); }
  upgrade() { this.beep(523, 0.06, 'triangle', 0.05); this.beep(784, 0.08, 'triangle', 0.04); }
  error() { this.beep(180, 0.1, 'sawtooth', 0.05); }
}
export const audio = new AudioEngine();
