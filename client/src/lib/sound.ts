// Every sound in the game — sfx and background music — is synthesized live
// with the Web Audio API instead of shipped as audio files. Keeps the bundle
// free of binary assets and sidesteps licensing for "funny" sound effects.

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.35;
    sfxGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.1;
    musicGain.connect(ctx.destination);
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

// Cheerful ascending "ta-da" into a held shimmer.
export function playCorrectGuessSound(): void {
  tone(523.25, 0, 0.12, { wave: "triangle", gain: 0.5 }); // C5
  tone(659.25, 0.09, 0.12, { wave: "triangle", gain: 0.5 }); // E5
  tone(783.99, 0.18, 0.3, { wave: "triangle", gain: 0.6 }); // G5
  tone(1046.5, 0.18, 0.3, { wave: "sine", gain: 0.32 }); // C6 shimmer
}

// Comedic sad-trombone "womp womp".
export function playWrongGuessSound(): void {
  tone(196, 0, 0.28, { wave: "sawtooth", gain: 0.32, glideTo: 130 });
  tone(164, 0.3, 0.35, { wave: "sawtooth", gain: 0.32, glideTo: 98 });
}

// Curious little "ooh, close" blip.
export function playNearMissSound(): void {
  tone(880, 0, 0.08, { wave: "square", gain: 0.22 });
  tone(988, 0.1, 0.12, { wave: "square", gain: 0.22 });
}

export function playRoundEndSound(): void {
  tone(392, 0, 0.15, { wave: "triangle", gain: 0.35 });
  tone(523.25, 0.12, 0.25, { wave: "triangle", gain: 0.4 });
}

// ---- background music: a goofy looping arpeggio, scheduled one step at a
// time via setTimeout. Not sample-accurate, but nobody's dancing to a party
// doodle game's elevator music that closely. ----

const MUSIC_PATTERN = [261.63, 329.63, 392.0, 329.63, 261.63, 349.23, 392.0, 440.0];
const STEP_MS = 260;

function scheduleMusicStep(): void {
  const c = getCtx();
  if (!musicGain) return;
  const freq = MUSIC_PATTERN[musicStep % MUSIC_PATTERN.length]!;
  const start = c.currentTime;
  const stepSec = STEP_MS / 1000;

  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(1, start + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, start + stepSec);
  osc.connect(env);
  env.connect(musicGain);
  osc.start(start);
  osc.stop(start + stepSec + 0.02);

  // A goofy little bass "boing" every 4th step keeps the loop from feeling flat.
  if (musicStep % 4 === 0) {
    const bass = c.createOscillator();
    const bassEnv = c.createGain();
    bass.type = "square";
    bass.frequency.setValueAtTime(freq / 4, start);
    bassEnv.gain.setValueAtTime(0, start);
    bassEnv.gain.linearRampToValueAtTime(0.6, start + 0.02);
    bassEnv.gain.exponentialRampToValueAtTime(0.001, start + stepSec);
    bass.connect(bassEnv);
    bassEnv.connect(musicGain);
    bass.start(start);
    bass.stop(start + stepSec + 0.02);
  }

  musicStep += 1;
  musicTimer = setTimeout(scheduleMusicStep, STEP_MS);
}

export function startBackgroundMusic(): void {
  if (musicTimer) return; // already running
  unlockAudio();
  musicStep = 0;
  scheduleMusicStep();
}

export function stopBackgroundMusic(): void {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
}
