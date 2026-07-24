// Every sound effect is synthesized live with the Web Audio API instead of
// shipped as audio files — keeps the bundle free of binary assets and
// sidesteps licensing for "funny" sound effects. No background music: it was
// tried and pulled per feedback (was just noise under the party chaos).

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.35;
    sfxGain.connect(ctx.destination);
  }
  return ctx;
}

// Browsers refuse to start an AudioContext before a user gesture. Call this
// from any early click/keydown handler; safe (and cheap) to call repeatedly.
export function unlockAudio(): void {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  opts: { wave?: OscillatorType; gain?: number; glideTo?: number } = {}
): void {
  const c = getCtx();
  if (!sfxGain) return;
  const { wave = "sine", gain = 1, glideTo } = opts;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = wave;
  const start = c.currentTime + startOffset;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, start + duration);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.015);
  env.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(env);
  env.connect(sfxGain);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function pickIndex(count: number): number {
  return Math.floor(Math.random() * count);
}

// ---- correct guess: a couple of cheerful little jingles, picked at random
// so a chatty round doesn't hear the exact same "ta-da" every time. ----

const CORRECT_VARIANTS: (() => void)[] = [
  () => {
    tone(523.25, 0, 0.12, { wave: "triangle", gain: 0.5 }); // C5
    tone(659.25, 0.09, 0.12, { wave: "triangle", gain: 0.5 }); // E5
    tone(783.99, 0.18, 0.3, { wave: "triangle", gain: 0.6 }); // G5
    tone(1046.5, 0.18, 0.3, { wave: "sine", gain: 0.32 }); // C6 shimmer
  },
  () => {
    tone(659.25, 0, 0.09, { wave: "square", gain: 0.4 });
    tone(783.99, 0.08, 0.09, { wave: "square", gain: 0.4 });
    tone(987.77, 0.16, 0.09, { wave: "square", gain: 0.4 });
    tone(1318.5, 0.24, 0.28, { wave: "triangle", gain: 0.45 });
  },
];

export function playCorrectGuessSound(): void {
  CORRECT_VARIANTS[pickIndex(CORRECT_VARIANTS.length)]!();
}

// ---- wrong guess: comedic "womp womp" trombone, or a silly boing. ----

const WRONG_VARIANTS: (() => void)[] = [
  () => {
    tone(196, 0, 0.28, { wave: "sawtooth", gain: 0.32, glideTo: 130 });
    tone(164, 0.3, 0.35, { wave: "sawtooth", gain: 0.32, glideTo: 98 });
  },
  () => {
    tone(440, 0, 0.18, { wave: "square", gain: 0.28, glideTo: 110 });
  },
];

export function playWrongGuessSound(): void {
  WRONG_VARIANTS[pickIndex(WRONG_VARIANTS.length)]!();
}

// Curious little "ooh, close" blip.
export function playNearMissSound(): void {
  tone(880, 0, 0.08, { wave: "square", gain: 0.22 });
  tone(988, 0.1, 0.12, { wave: "square", gain: 0.22 });
}

// Round completion: a goofy little kazoo-ish fanfare with a wobbly landing
// note, distinct from the plain correct-guess jingle.
export function playRoundEndSound(): void {
  tone(392, 0, 0.12, { wave: "triangle", gain: 0.4 });
  tone(523.25, 0.1, 0.12, { wave: "triangle", gain: 0.42 });
  tone(659.25, 0.2, 0.18, { wave: "sawtooth", gain: 0.3 });
  tone(622.25, 0.34, 0.08, { wave: "sawtooth", gain: 0.28 });
  tone(659.25, 0.42, 0.22, { wave: "sawtooth", gain: 0.3, glideTo: 698.46 });
}
