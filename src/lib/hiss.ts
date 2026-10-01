// Quiet tape hiss made with Web Audio. Off by default; only starts from a button press.
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;

export function setHiss(on: boolean) {
  if (!on) {
    source?.stop();
    source = null;
    return;
  }
  if (source) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      // brown-ish noise: softer than white noise, closer to tape
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.2;
    }
    gain = ctx.createGain();
    gain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 400;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    source = null; // no audio support: stay silent
  }
}
