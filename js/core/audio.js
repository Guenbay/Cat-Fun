/**
 * Winzige WebAudio-Schicht: erzeugt alle Töne synthetisch,
 * damit das Projekt ohne Audio-Dateien auskommt.
 */
let ctx = null;
let enabled = true;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
}

export function isSoundEnabled() {
  return enabled;
}

function blip({ freq = 440, dur = 0.12, type = "sine", gain = 0.07, delay = 0 }) {
  const ac = ensureCtx();
  if (!ac) return;

  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const vol = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  vol.gain.setValueAtTime(0, t0);
  vol.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(vol).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const CUES = {
  draw:      () => blip({ freq: 520, dur: 0.1, type: "triangle" }),
  rare:      () => [660, 880].forEach((f, i) => blip({ freq: f, delay: i * 0.08, type: "triangle" })),
  epic:      () => [660, 880, 1046].forEach((f, i) => blip({ freq: f, delay: i * 0.075, type: "square", gain: 0.05 })),
  legendary: () => [523, 659, 784, 1046, 1318].forEach((f, i) => blip({ freq: f, delay: i * 0.085, dur: 0.22, type: "triangle", gain: 0.06 })),
  levelup:   () => [392, 523, 659, 784].forEach((f, i) => blip({ freq: f, delay: i * 0.1, dur: 0.3, type: "sawtooth", gain: 0.045 })),
  unlock:    () => [880, 1174].forEach((f, i) => blip({ freq: f, delay: i * 0.09, dur: 0.18, type: "sine", gain: 0.06 })),
  click:     () => blip({ freq: 300, dur: 0.06, type: "sine", gain: 0.04 }),
};

export function play(cue) {
  if (!enabled) return;
  try {
    CUES[cue]?.();
  } catch {
    /* Audio ist Beiwerk, nie ein Grund zum Abbruch */
  }
}
