/**
 * The two sounds of the app, made with Web Audio (no sound files). Every function takes the audio context as its first argument,
 * so the same code runs in the page and, in tests, on an offline or recording context.
 *
 * The message sound (`pling`) is a marimba playing C4, D4 and A4 (Dan Joakim, 25 Oct). The reference file he sent was measured, not
 * copied: ground tone 260 Hz with a decay of 0.17 s, and three overtones. `ringing` / `dobbelt` is the double ping: an old telephone
 * bell with two bells struck alternately about 24 times a second, two rounds of about a second ("brrring-brrring"). It is meant to
 * sound like a ringing phone, not like the message melody.
 *
 * Claude cannot hear (decision log rule 8), so the sound is checked by numbers: tests/sound-unit.js compares every call made on the
 * audio context with tests/fixtures/sound-vectors.json (made by the JavaScript this replaced), and tests/sound.js renders the sounds
 * offline in a browser and measures the pitches and that nothing clips. Change a number here and both tests fail on purpose.
 */

/** One shared output with a compressor per audio context, so the sound can be loud without clipping (low notes are faint on small speakers). */
const buses = new WeakMap<BaseAudioContext, GainNode>();

export function marimbaBus(c: BaseAudioContext): GainNode {
  let g = buses.get(c);
  if (!g) {
    g = c.createGain();
    const k = c.createDynamicsCompressor();
    g.gain.value = 1;
    k.threshold.value = -14; k.knee.value = 8; k.ratio.value = 5; k.attack.value = .002; k.release.value = .18;
    g.connect(k); k.connect(c.destination);
    buses.set(c, g);
  }
  return g;
}

/** Overtones of one marimba note: [multiple of the ground tone, amplitude, decay time constant in seconds]. */
const MARIMBA_PARTS: ReadonlyArray<readonly [number, number, number]> = [[1, 1, .17], [4.01, .34, .04], [8.78, .16, .015], [3, .1, .015]];

/** One marimba note of frequency `f` Hz, starting `at` seconds from now, at volume `vol`. */
export function marimba(c: BaseAudioContext, f: number, at: number, vol: number): void {
  const t = c.currentTime + at, bus = marimbaBus(c);
  MARIMBA_PARTS.forEach(([m, a, tau]) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = f * m;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol * a, t + .003); g.gain.setTargetAtTime(0, t + .003, tau);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + tau * 8 + .05);
  });
}

/** The message sound: C4, D4, A4, 0.13 s apart. */
export function pling(c: BaseAudioContext, v = .12, at = 0): void {
  const k = 260.2 / 261.63; // the same slight tuning as the reference
  ([[261.63, 0], [293.66, .13], [440, .26]] as const).forEach(([f, d]) => marimba(c, f * k, at + d, v * 4.4));
}

/** Bell tones: [multiple of the bell's pitch, amplitude, decay time constant]. Not whole multiples, as in a real bell. */
const BELL_PARTS: ReadonlyArray<readonly [number, number, number]> = [[1, 1, .07], [2.32, .55, .05], [3.86, .32, .035], [5.43, .16, .025]];

/** The ringing sound used by the double ping: two bells (1480 and 1870 Hz) struck by turns, two rounds. */
export function ringing(c: BaseAudioContext, v: number): void {
  const bus = marimbaBus(c), t0 = c.currentTime + .02;
  const bells = [[1480, 0], [1870, 1]] as const, step = 1 / 24;
  ([[0, 1.0], [1.35, 1.0]] as const).forEach(([s, len]) => {
    bells.forEach(([f, par]) => BELL_PARTS.forEach(([m, a, tau]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = f * m; g.gain.value = 0;
      for (let i = par; i * step < len; i += 2) {
        const t = t0 + s + i * step;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + .002); g.gain.setTargetAtTime(0, t + .002, tau);
      }
      o.connect(g); g.connect(bus); o.start(t0 + s); o.stop(t0 + s + len + .4);
    }));
  });
}

/** The double ping sound. */
export function dobbelt(c: BaseAudioContext): void { ringing(c, .34); }
