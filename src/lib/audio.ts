// The show's soundtrack. One song, stretched forever:
// passages from random points in the track, quiet breaks of tape hiss between them,
// and now and then a slowed, warbling pass, like a tape that's been left somewhere warm.
// Only ever started from a button press (browsers block sound before that).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let staticGain: GainNode | null = null;
let song: AudioBuffer | null = null;
let noise: AudioBuffer | null = null;
let loading: Promise<void> | null = null;
let running = false;
let enabled = true;
let ducked = false;
let timer = 0;
let firstPassage = true;
let live: AudioScheduledSourceNode[] = [];

const MUSIC_LEVEL = 0.38;
const DUCK_LEVEL = 0.06;

function makeNoise(c: AudioContext): AudioBuffer {
  const length = c.sampleRate * 2;
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

function targetLevel() {
  if (!enabled) return 0;
  return ducked ? DUCK_LEVEL : MUSIC_LEVEL;
}

function applyLevel(seconds = 0.8) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(targetLevel(), now + seconds);
}

function track(node: AudioScheduledSourceNode) {
  live.push(node);
  node.onended = () => {
    live = live.filter((n) => n !== node);
  };
}

/** Plays one stretch of the song, then schedules a break. */
function playPassage() {
  if (!ctx || !musicBus || !song || !running) return;
  const c = ctx;
  const slowed = !firstPassage && Math.random() < 0.25;
  const rate = slowed ? 0.93 : 1;
  const offset = firstPassage ? 0 : Math.random() * Math.max(0, song.duration - 50);
  // The first pass is always the whole song from the very beginning.
  const length = firstPassage ? song.duration : Math.min(song.duration - offset, 35 + Math.random() * 55);
  firstPassage = false;

  const src = c.createBufferSource();
  src.buffer = song;
  src.playbackRate.value = rate;

  // Tape wow: a slow wobble in pitch, stronger on the slowed passes.
  const wow = c.createOscillator();
  wow.frequency.value = slowed ? 0.35 : 0.6;
  const wowDepth = c.createGain();
  wowDepth.gain.value = slowed ? 0.012 : 0.003;
  wow.connect(wowDepth).connect(src.playbackRate);

  const fade = c.createGain();
  const now = c.currentTime;
  const realLength = length / rate;
  fade.gain.setValueAtTime(0, now);
  fade.gain.linearRampToValueAtTime(1, now + 1.5);
  fade.gain.setValueAtTime(1, now + realLength - 2.5);
  fade.gain.linearRampToValueAtTime(0, now + realLength);

  src.connect(fade).connect(musicBus);
  src.start(now, offset, length);
  wow.start(now);
  wow.stop(now + realLength + 0.1);
  track(src);
  track(wow);

  timer = window.setTimeout(playBreak, realLength * 1000);
}

/** A gap between passages: soft hiss most of the time, sometimes true silence. */
function playBreak() {
  if (!ctx || !musicBus || !noise || !running) return;
  const c = ctx;
  // Breaks between passages: 8 to 26 seconds (doubled 2026-10-01).
  const seconds = 8 + Math.random() * 18;
  if (Math.random() < 0.7) {
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 500;
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.6);
    g.gain.setValueAtTime(0.12, now + seconds - 0.6);
    g.gain.linearRampToValueAtTime(0, now + seconds);
    src.connect(filter).connect(g).connect(musicBus);
    src.start(now);
    src.stop(now + seconds);
    track(src);
  }
  timer = window.setTimeout(playPassage, seconds * 1000);
}

/** Index of the first/last sample louder than near-silence, so the halves meet without a gap. */
function soundBounds(buf: AudioBuffer): [number, number] {
  const d = buf.getChannelData(0);
  const floor = 0.004;
  let start = 0;
  while (start < d.length && Math.abs(d[start]) < floor) start++;
  let end = d.length - 1;
  while (end > start && Math.abs(d[end]) < floor) end--;
  return [start, end + 1];
}

/**
 * The song comes in two halves (the first one stops short). Join them into one buffer:
 * trim the silence at the seam and cross-fade 80 ms so it plays as a single piece.
 */
function joinHalves(c: AudioContext, parts: AudioBuffer[]): AudioBuffer {
  if (parts.length === 1) return parts[0];
  const rate = parts[0].sampleRate;
  const fade = Math.round(rate * 0.08);
  const channels = Math.max(...parts.map((p) => p.numberOfChannels));
  const trimmed = parts.map((p, i) => {
    const [s, e] = soundBounds(p);
    return { buf: p, start: i === 0 ? 0 : s, end: i === parts.length - 1 ? p.length : e };
  });
  const total = trimmed.reduce((n, t) => n + (t.end - t.start), 0) - fade * (parts.length - 1);
  const out = c.createBuffer(channels, total, rate);
  for (let ch = 0; ch < channels; ch++) {
    const o = out.getChannelData(ch);
    let at = 0;
    trimmed.forEach((t, i) => {
      const src = t.buf.getChannelData(Math.min(ch, t.buf.numberOfChannels - 1));
      const len = t.end - t.start;
      for (let k = 0; k < len; k++) {
        let v = src[t.start + k];
        // equal-power fade in over the overlap (not on the first half)
        if (i > 0 && k < fade) v *= Math.sin((k / fade) * (Math.PI / 2));
        // equal-power fade out over the overlap (not on the last half)
        if (i < trimmed.length - 1 && k >= len - fade) v *= Math.cos(((k - (len - fade)) / fade) * (Math.PI / 2));
        o[at + k] += v;
      }
      at += len - fade;
    });
  }
  return out;
}

async function load(urls: string[]) {
  if (!ctx) return;
  const c = ctx;
  const parts = await Promise.all(
    urls.map(async (u) => c.decodeAudioData(await (await fetch(u)).arrayBuffer())),
  );
  song = joinHalves(c, parts);
}

let looping = false;

/** Starts the passage/break loop once the song is decoded and the browser lets sound play. */
function beginIfReady() {
  if (looping || !running || !song || !ctx || ctx.state !== "running" || document.hidden) return;
  looping = true;
  playPassage();
}

/** Stops the loop cleanly (tab hidden): no stacked passages waiting when it comes back. */
function haltLoop() {
  looping = false;
  window.clearTimeout(timer);
  live.forEach((n) => {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
  });
  live = [];
}

let unlockArmed = false;

/**
 * Browsers refuse sound until the visitor touches the page. So the song is loaded straight away,
 * and the very first tap, click or key press anywhere starts it.
 */
function armUnlock() {
  if (unlockArmed) return;
  unlockArmed = true;
  const events = ["pointerdown", "touchend", "keydown", "click"] as const;
  const unlock = () => {
    if (!ctx) return;
    void ctx.resume().then(() => {
      if (ctx?.state !== "running") return;
      events.forEach((e) => window.removeEventListener(e, unlock, true));
      unlockArmed = false;
      beginIfReady();
    });
  };
  events.forEach((e) => window.addEventListener(e, unlock, true));
}

export const AUDIO_EVENT = "lookagain-audio";

/** True while the browser is still holding sound back, waiting for the first touch. */
export function isAudioBlocked() {
  return !ctx || ctx.state !== "running";
}

/** Call as early as possible: on page load, and again from any button press. */
export function startMusic(urls: string[]) {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.connect(master);
      noise = makeNoise(ctx);
      ctx.onstatechange = () => {
        beginIfReady();
        window.dispatchEvent(new Event(AUDIO_EVENT));
      };
      document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        if (document.hidden) {
          haltLoop();
          void ctx.suspend();
        } else if (running) {
          void ctx.resume().then(beginIfReady);
        }
      });
      // Any video or audio on the page plays over a quiet bed.
      document.addEventListener("play", () => setDucked(true), true);
      document.addEventListener("pause", () => setDucked(false), true);
      document.addEventListener("ended", () => setDucked(false), true);
    }
    running = true;
    applyLevel(1.5);
    loading ??= load(urls).catch(() => {
      running = false; // no file or no decoder: stay silent
    });
    void loading.then(beginIfReady);
    if (ctx.state !== "running") {
      void ctx.resume().then(beginIfReady, () => {});
      armUnlock();
    }
  } catch {
    running = false;
  }
}

export function setMusicEnabled(on: boolean) {
  enabled = on;
  applyLevel();
}

/** Cut the song completely (static and voices still play), or bring it back. */
export function holdMusic(on: boolean) {
  if (!ctx || !musicBus) return;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(on ? 0 : 1, now + (on ? 0.15 : 1.2));
}

/** Turn the music down under a voice (and back up). */
export function duckMusic(on: boolean) {
  setDucked(on);
}

function setDucked(on: boolean) {
  ducked = on;
  applyLevel(0.4);
}

/** Radio static for the tuner puzzle, 0 to 1. */
export function setStatic(level: number) {
  if (!ctx || !master || !noise) return;
  if (!staticGain) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.6;
    staticGain = ctx.createGain();
    staticGain.gain.value = 0;
    src.connect(filter).connect(staticGain).connect(master);
    src.start();
  }
  const now = ctx.currentTime;
  staticGain.gain.cancelScheduledValues(now);
  staticGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, level)) * 0.5, now + 0.08);
}

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__audio = () => ({
    state: ctx?.state,
    decoded: song ? Math.round(song.duration) : null,
    voices: live.length,
    level: master?.gain.value,
  });
  // Dev only: silence the test browser without touching game state.
  (window as unknown as Record<string, unknown>).__mute = () => {
    enabled = false;
    applyLevel(0.05);
  };
}

/** Back to the very start of the song (used when the game starts over). */
export function restartMusic() {
  haltLoop();
  firstPassage = true;
  beginIfReady();
}

export function stopMusic() {
  running = false;
  haltLoop();
}
