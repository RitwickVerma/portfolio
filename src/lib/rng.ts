// A small seeded generator for the figures that simulate. mulberry32 is four
// lines, fast, and gives the same stream in every engine because it only uses
// integer arithmetic. `normal` is a sum of twelve uniforms (Irwin-Hall) rather
// than Box-Muller so the figures use nothing but + and *, which every JS engine
// rounds the same way; the server render and the browser then agree to the bit.

export type Rng = () => number;

/** Uniform on [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mean 0, standard deviation 1, tails cut at six. */
export function normal(rng: Rng): number {
  let s = -6;
  for (let i = 0; i < 12; i++) s += rng();
  return s;
}

/** Mixes a seed with an index into one stream seed. */
export function mix(seed: number, index: number): number {
  return (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0;
}
