import {
  AddressCooldown,
  Limiter,
  REFUSED_COOLING_V1,
  GLOBAL_WINDOW_MS,
  agentRefusal,
} from "./sudostamp";

// The model behind the limiter figure: a list of what the visitor sent, replayed
// through the real Limiter (or the 1.3.0 AddressCooldown) on a clock that the
// replay owns. Nothing here is a second implementation of a rule; it only feeds
// requests in and reads the state out. Pure, so it is tested like the rest.

export type Keying = "computer" | "address";
export type Computer = "a" | "b";
export type Answer = "approve" | "deny" | "ignore";

export interface RequestInput {
  from: Computer;
  /** A new source address for this request (IPv6 privacy addresses rotate). */
  fresh: boolean;
  /** Bytes the request asks the phone to sign. A pam_rssh challenge is 32. */
  payload: number;
  /** What the user does if the phone asks. */
  answer: Answer;
  /** Time between the end of the previous request and this one arriving. */
  gapMs: number;
}

/** The user's answer to a prompt takes this long. An assumption of the figure, not a measurement. */
export const ANSWER_AFTER_MS = 2_000;
/** AgentService.APPROVAL_TIMEOUT_MS. */
export const APPROVAL_TIMEOUT_MS = 60_000;

export const GAPS_MS = [0, 3_000, 5_000, 10_000, 30_000, 60_000, 600_000] as const;

export type Outcome = "approved" | "denied" | "ignored" | "refused";
/** Which check said no. `payload` is the signer's own size check; the others are the limiter's. */
export type Rule = "payload" | "quiet" | "global" | "cooling";

export interface StateAfter {
  /** Ms left of the quiet period after an approval (0 under per-address keying: it does not exist there). */
  quietLeftMs: number;
  /** Who is cooling down, and for how long still. Computers under 1.4, addresses under 1.3. */
  cooling: { who: string; leftMs: number }[];
  /** Unapproved requests still inside the 10 minute window; null under 1.3, which has no global cap. */
  windowCount: number | null;
}

export interface Row {
  n: number;
  from: Computer;
  address: string;
  payload: number;
  atMs: number;
  endMs: number;
  outcome: Outcome;
  /** The limiter's or the signer's own message. Null when the user was asked. */
  reason: string | null;
  rule: Rule | null;
  asked: boolean;
  state: StateAfter;
  /** Whether the other keying, given the same requests, would have put this one to the user. */
  askedUnderOther: boolean;
}

export const COMPUTER_NAME: Record<Computer, string> = { a: "Computer A", b: "Computer B" };

/** Documentation addresses (RFC 3849): never a real host. */
export function addressesFor(inputs: RequestInput[]): string[] {
  const fresh: Record<Computer, number> = { a: 0, b: 0 };
  return inputs.map((i) => {
    if (!i.fresh) return `2001:db8::${i.from}`;
    fresh[i.from] += 1;
    return `2001:db8::${i.from}:${fresh[i.from].toString(16)}`;
  });
}

function ruleOf(reason: string): Rule {
  if (reason.startsWith("refusing to sign") || reason.startsWith("sign request for a key")) return "payload";
  if (reason.startsWith("a request was just approved")) return "quiet";
  if (reason.startsWith("too many")) return "global";
  return "cooling";
}

interface Run {
  rows: Omit<Row, "askedUnderOther">[];
}

function run(inputs: RequestInput[], keying: Keying): Run {
  const addresses = addressesFor(inputs);
  let clock = 0;
  const limiter = new Limiter(() => clock);
  const cooldown = new AddressCooldown(undefined, () => clock);
  const trusted = new Set<Computer>(); // Hosts.confirmed: approved at least once
  const knownAddresses = new Set<string>(); // KnownHosts, v1.3.0
  const rows: Run["rows"] = [];
  let end = 0;

  inputs.forEach((input, idx) => {
    const address = addresses[idx];
    const at = end + (idx === 0 ? 0 : input.gapMs);
    clock = at;
    const data = new Uint8Array(input.payload);

    let reason: string | null = agentRefusal(true, data);
    if (reason === null) {
      if (keying === "computer") reason = limiter.refusal(input.from);
      else if (cooldown.active(address, knownAddresses.has(address))) reason = REFUSED_COOLING_V1;
    }

    let outcome: Outcome;
    let endMs = at;
    if (reason !== null) {
      outcome = "refused";
    } else {
      const knownBefore = keying === "computer" ? trusted.has(input.from) : knownAddresses.has(address);
      if (input.answer === "approve") {
        endMs = at + ANSWER_AFTER_MS;
        clock = endMs;
        outcome = "approved";
        if (keying === "computer") limiter.approved();
        trusted.add(input.from);
        knownAddresses.add(address);
      } else {
        endMs = at + (input.answer === "deny" ? ANSWER_AFTER_MS : APPROVAL_TIMEOUT_MS);
        clock = endMs;
        outcome = input.answer === "deny" ? "denied" : "ignored";
        if (keying === "computer") limiter.unapproved(input.from, knownBefore);
        else cooldown.unapproved(address, knownBefore);
      }
    }
    end = endMs;

    const state: StateAfter =
      keying === "computer"
        ? (() => {
            const s = limiter.snapshot();
            return {
              quietLeftMs: Math.max(0, s.quietUntil - endMs),
              cooling: s.until
                .filter(([, until]) => until > endMs)
                .map(([who, until]) => ({ who: COMPUTER_NAME[who as Computer], leftMs: until - endMs })),
              windowCount: s.recent.filter((t) => endMs - t < GLOBAL_WINDOW_MS).length,
            };
          })()
        : {
            quietLeftMs: 0,
            cooling: cooldown
              .snapshot()
              .filter(([who, until]) => until > endMs && !knownAddresses.has(who))
              .map(([who, until]) => ({ who, leftMs: until - endMs })),
            windowCount: null,
          };

    rows.push({
      n: idx + 1,
      from: input.from,
      address,
      payload: input.payload,
      atMs: at,
      endMs,
      outcome,
      reason,
      rule: reason === null ? null : ruleOf(reason),
      asked: reason === null,
      state,
    });
  });
  return { rows };
}

/** Every request replayed under `keying`, each marked with what the other keying would have done with the same requests. */
export function timeline(inputs: RequestInput[], keying: Keying): Row[] {
  const mine = run(inputs, keying).rows;
  const other = run(inputs, keying === "computer" ? "address" : "computer").rows;
  return mine.map((r, i) => ({ ...r, askedUnderOther: other[i].asked }));
}

/** m:ss from milliseconds. */
export function clockText(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "45 s", "9 min 58 s", for a time left. */
export function leftText(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return s % 60 === 0 ? `${m} min` : `${m} min ${s % 60} s`;
}

export function gapText(ms: number): string {
  if (ms === 0) return "0 s, queued behind";
  if (ms < 60_000) return `${ms / 1000} s`;
  return `${ms / 60_000} min`;
}

/** What the visitor sees on first load: an approval, a request right behind it, a denial, and the same computer again from a new address. */
export const EXAMPLE: RequestInput[] = [
  { from: "a", fresh: false, payload: 32, answer: "approve", gapMs: 0 },
  { from: "a", fresh: false, payload: 32, answer: "approve", gapMs: 0 },
  { from: "b", fresh: true, payload: 32, answer: "deny", gapMs: 10_000 },
  { from: "b", fresh: true, payload: 32, answer: "deny", gapMs: 5_000 },
];
