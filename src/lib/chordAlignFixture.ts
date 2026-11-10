import type { TimedLine } from "./chordAlign";

// The song the figure and the tests use: "Amazing Grace", John Newton, 1779, public domain.
// Timestamps: the first four (6, 13, 20, 27 s) are the ones in Chordist's own test fixture
// (tests/qml/fixture_service.py); the other eight, and the 90 s length, are invented. The chart
// rows are the same words as the lines, which is the easy case; the edits are what make it hard.

export const GRACE_LINES: TimedLine[] = [
  { t: 6, text: "Amazing grace how sweet the sound" },
  { t: 13, text: "That saved a wretch like me" },
  { t: 20, text: "I once was lost but now am found" },
  { t: 27, text: "Was blind but now I see" },
  { t: 34, text: "'Twas grace that taught my heart to fear" },
  { t: 41, text: "And grace my fears relieved" },
  { t: 48, text: "How precious did that grace appear" },
  { t: 55, text: "The hour I first believed" },
  { t: 62, text: "Through many dangers toils and snares" },
  { t: 69, text: "I have already come" },
  { t: 76, text: "'Tis grace hath brought me safe thus far" },
  { t: 83, text: "And grace will lead me home" },
];

/** Length of the recording, seconds; rows after the last matched one are spread out to here. */
export const GRACE_DURATION = 90;

export const GRACE_ROWS: string[] = GRACE_LINES.map((l) => l.text);

/** m:ss, rounded to the second. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
