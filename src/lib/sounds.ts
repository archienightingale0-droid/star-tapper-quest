// Lightweight synthesized sound effects using the Web Audio API.
// No audio files to download — sounds are generated on the fly.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
  freqEnd?: number,
) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Soft sparkle pop when tapping the star. Pitch rises with combo taps. */
export function playTap(pitchStep = 0) {
  const base = 420 + Math.min(pitchStep, 8) * 40;
  tone(base, 0.12, "triangle", 0.12, 0, base * 1.6);
  tone(base * 2.5, 0.08, "sine", 0.05, 0.01);
}

/** Rising chime when buying an upgrade. */
export function playBuy(tier = 0) {
  const root = 330 * Math.pow(1.0595, Math.min(tier, 6) * 2);
  tone(root, 0.15, "triangle", 0.1);
  tone(root * 1.5, 0.15, "triangle", 0.1, 0.09);
  tone(root * 2, 0.22, "triangle", 0.1, 0.18);
}

/** Muted thud when a purchase fails (handled silently in UI, kept for completeness). */
export function playFail() {
  tone(160, 0.12, "square", 0.04, 0, 90);
}
