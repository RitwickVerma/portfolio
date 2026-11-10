// SudoStamp's rate limiter, its signing refusal and its DER-to-SSH signature
// conversion, ported from the app's Kotlin to TypeScript with the clock
// injected. Source: https://gitlab.com/ritwick7/sudostamp (MIT):
//   app/src/main/java/com/ritwick/sudostamp/{Limiter,SshSig,AgentProtocol}.kt
//   and Cooldown.kt as shipped in v1.3.0.
//
// Constants, messages, order of checks and error messages follow the Kotlin
// line for line. Three things are additions that the Kotlin does not have:
// `Limiter.snapshot` (so a figure can show the state it decided from),
// `derEncode` (the Kotlin keeps it in SshSigTest.kt) and
// `signatureBlobWithoutSignPad` (the bug the figure demonstrates; the app
// never builds it). Pure functions and plain classes: no DOM, no network.
//
// Unsigned big-endian byte arrays stand in for BigInteger so the file needs
// no BigInt (the build targets ES2017).

// ───────────────────────────── Limiter.kt ─────────────────────────────────

export const QUIET_AFTER_APPROVAL_MS = 3_000;
export const COOLDOWN_TRUSTED_MS = 5_000;
export const COOLDOWN_PENDING_MS = 60_000;
export const GLOBAL_LIMIT = 4;
export const GLOBAL_WINDOW_MS = 10 * 60_000;

export const REFUSED_QUIET = "a request was just approved; refusing the next one for a moment";
export const REFUSED_GLOBAL = "too many unapproved requests recently";
export const REFUSED_COOLING = "cooling down after an unapproved request from this computer";

export interface LimiterSnapshot {
  quietUntil: number;
  /** Per computer: when its cooldown ends. */
  until: [hostId: string, until: number][];
  /** Times of the last unapproved requests, oldest first (at most GLOBAL_LIMIT). */
  recent: number[];
}

/**
 * Decides when a sign request may NOT be put to the user, even though it names
 * a paired computer's key. Keyed by computer, never by IP address.
 */
export class Limiter {
  private quietUntil = 0;
  private until = new Map<string, number>();
  private recent: number[] = [];

  constructor(private now: () => number = Date.now) {}

  /** Why a request for `hostId` must be refused without asking, or null if it may be asked. */
  refusal(hostId: string): string | null {
    const t = this.now();
    while (this.recent.length > 0 && t - this.recent[0] >= GLOBAL_WINDOW_MS) this.recent.shift();
    if (t < this.quietUntil) return REFUSED_QUIET;
    if (this.recent.length >= GLOBAL_LIMIT) return REFUSED_GLOBAL;
    if (t < (this.until.get(hostId) ?? 0)) return REFUSED_COOLING;
    return null;
  }

  approved(): void {
    this.quietUntil = this.now() + QUIET_AFTER_APPROVAL_MS;
  }

  /** A request for `hostId` was denied or timed out. `trusted`: approved before. */
  unapproved(hostId: string, trusted: boolean): void {
    const t = this.now();
    this.until.set(hostId, t + (trusted ? COOLDOWN_TRUSTED_MS : COOLDOWN_PENDING_MS));
    this.recent.push(t);
    while (this.recent.length > GLOBAL_LIMIT) this.recent.shift();
  }

  /** Forget `hostId` (it was removed). */
  forget(hostId: string): void {
    this.until.delete(hostId);
  }

  /** Not in the Kotlin: a read-only copy of the state, for display. */
  snapshot(): LimiterSnapshot {
    return { quietUntil: this.quietUntil, until: [...this.until], recent: [...this.recent] };
  }
}

// ───────────────────────────── Cooldown.kt (v1.3.0) ───────────────────────

/** AgentService.COOLDOWN_MS in v1.3.0. */
export const COOLDOWN_V1_MS = 30_000;
const COOLDOWN_V1_MAX_HOSTS = 256;
export const REFUSED_COOLING_V1 = "cooling down after an unapproved request";

/**
 * The version 1 cooldown, as shipped in 1.3.0 and replaced by `Limiter` in
 * 1.4.0: keyed by the peer's address, and only for addresses never approved.
 */
export class AddressCooldown {
  private until = new Map<string, number>();

  constructor(
    private windowMs: number = COOLDOWN_V1_MS,
    private now: () => number = Date.now,
  ) {}

  /** True if requests from `host` must be refused without prompting right now. */
  active(host: string, known: boolean): boolean {
    if (known) return false;
    const t = this.until.get(host);
    if (t === undefined) return false;
    if (this.now() >= t) {
      this.until.delete(host);
      return false;
    }
    return true;
  }

  /** Records an unapproved request (denied or timed out) from `host`. */
  unapproved(host: string, known: boolean): void {
    if (known) return;
    // Bounded: a LAN can hold many addresses, and this must not grow without limit.
    if (this.until.size >= COOLDOWN_V1_MAX_HOSTS) {
      const t = this.now();
      for (const [k, v] of [...this.until]) if (v <= t) this.until.delete(k);
      if (this.until.size >= COOLDOWN_V1_MAX_HOSTS) {
        let oldest: string | undefined;
        let min = Infinity;
        for (const [k, v] of this.until) {
          if (v < min) {
            min = v;
            oldest = k;
          }
        }
        if (oldest !== undefined) this.until.delete(oldest);
      }
    }
    this.until.set(host, this.now() + this.windowMs);
  }

  snapshot(): [address: string, until: number][] {
    return [...this.until];
  }
}

// ───────────────────────────── AgentProtocol.kt ───────────────────────────

/** The only thing the agent will sign: a pam_rssh challenge, exactly 32 bytes. */
export const CHALLENGE_BYTES = 32;

/**
 * Why a sign request must be refused without asking the user, or null if it may
 * be put to them. `knownKey`: the key it names belongs to a paired computer.
 */
export function agentRefusal(knownKey: boolean, data: Uint8Array): string | null {
  if (!knownKey) return "sign request for a key this phone did not make for any paired computer";
  if (data.length !== CHALLENGE_BYTES) return `refusing to sign ${data.length} bytes: not a pam_rssh challenge`;
  return null;
}

// ───────────────────────────── SshSig.kt ──────────────────────────────────

export const KEY_TYPE = "ecdsa-sha2-nistp256";

function ascii(s: string): Uint8Array {
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** SSH "string": uint32 big-endian length, then the bytes. */
export function sshString(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length, false);
  out.set(bytes, 4);
  return out;
}

function stripLeadingZeros(b: Uint8Array): Uint8Array {
  let i = 0;
  while (i < b.length && b[i] === 0) i++;
  return b.subarray(i);
}

/**
 * mpint per RFC 4251: two's-complement, big-endian, minimal length, with a
 * leading 0x00 when the top bit is set so it is not read as negative. `v` is
 * the unsigned magnitude. (BigInteger.toByteArray() does exactly this.)
 */
export function mpint(v: Uint8Array): Uint8Array {
  const m = stripLeadingZeros(v);
  return m.length > 0 && (m[0] & 0x80) !== 0 ? concat([Uint8Array.of(0), m]) : Uint8Array.from(m);
}

/**
 * Parse DER SEQUENCE { INTEGER r, INTEGER s }. Strict; throws on anything else.
 * Returns r and s as unsigned big-endian magnitudes with no leading zeros.
 */
export function derToRs(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  let i = 0;
  const byte = (): number => {
    if (!(i < der.length)) throw new Error("DER truncated");
    return der[i++];
  };
  const length = (): number => {
    const first = byte();
    if ((first & 0x80) === 0) return first;
    const n = first & 0x7f;
    if (!(n >= 1 && n <= 2)) throw new Error("bad DER length");
    let len = 0;
    for (let k = 0; k < n; k++) len = (len << 8) | byte();
    return len;
  };

  if (byte() !== 0x30) throw new Error("not a DER SEQUENCE");
  const seqLen = length();
  if (i + seqLen !== der.length) throw new Error("DER SEQUENCE length does not match its contents");

  const parts: Uint8Array[] = [];
  for (let k = 0; k < 2; k++) {
    if (byte() !== 0x02) throw new Error("expected INTEGER");
    const len = length();
    // A P-256 scalar is at most 32 bytes, plus one 0x00 sign pad.
    if (!(len >= 1 && len <= 33)) throw new Error(`bad INTEGER length ${len}`);
    if (!(i + len <= der.length)) throw new Error("DER truncated");
    parts.push(stripLeadingZeros(der.subarray(i, i + len)));
    i += len;
  }
  if (i !== der.length) throw new Error("trailing bytes after DER SEQUENCE");

  const [r, s] = parts;
  if (r.length === 0 || s.length === 0) throw new Error("non-positive ECDSA component");
  return { r: Uint8Array.from(r), s: Uint8Array.from(s) };
}

/**
 * Signature blob:  string "ecdsa-sha2-nistp256"
 *                  string ( string r, string s )
 * `der` comes straight from java.security.Signature("SHA256withECDSA").
 */
export function signatureBlob(der: Uint8Array): Uint8Array {
  const { r, s } = derToRs(der);
  const inner = concat([sshString(mpint(r)), sshString(mpint(s))]);
  return concat([sshString(ascii(KEY_TYPE)), sshString(inner)]);
}

/**
 * Not in the app. The same conversion with the sign pad left out: r and s
 * written as bare big-endian magnitudes. Where a top bit is set, an mpint
 * reader sees a negative number. This is the failure SshSig.kt's header warns
 * about, built on purpose so a figure can show it.
 */
export function signatureBlobWithoutSignPad(der: Uint8Array): Uint8Array {
  const { r, s } = derToRs(der);
  const inner = concat([sshString(r), sshString(s)]);
  return concat([sshString(ascii(KEY_TYPE)), sshString(inner)]);
}

/** Minimal DER SEQUENCE { INTEGER r, INTEGER s } encoder (SshSigTest.derEncode). Lengths under 128 only. */
export function derEncode(r: Uint8Array, s: Uint8Array): Uint8Array {
  const int = (v: Uint8Array): Uint8Array => {
    const b = mpint(v); // DER INTEGER is the same two's complement as an mpint
    if (b.length >= 128) throw new Error("INTEGER too long for the one-byte DER length");
    return concat([Uint8Array.of(0x02, b.length), b]);
  };
  const body = concat([int(r), int(s)]);
  if (body.length >= 128) throw new Error("SEQUENCE too long for the one-byte DER length");
  return concat([Uint8Array.of(0x30, body.length), body]);
}

/** WebCrypto's ECDSA P-256 signature is r then s, 32 bytes each (IEEE P1363). */
export function rawToDer(raw: Uint8Array): Uint8Array {
  if (raw.length !== 64) throw new Error(`expected 64 bytes of r and s, got ${raw.length}`);
  return derEncode(raw.subarray(0, 32), raw.subarray(32));
}

/** The reverse of `rawToDer` for a blob: what a verifier does. Throws if r or s is not a valid mpint. */
export function parseSignatureBlob(blob: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  let at = 0;
  const view = new DataView(blob.buffer, blob.byteOffset, blob.length);
  const string = (): Uint8Array => {
    if (at + 4 > blob.length) throw new Error("truncated length");
    const n = view.getUint32(at, false);
    at += 4;
    if (n > blob.length - at) throw new Error("truncated string");
    const out = blob.subarray(at, at + n);
    at += n;
    return out;
  };
  const type = string();
  if (String.fromCharCode(...type) !== KEY_TYPE) throw new Error("not an ecdsa-sha2-nistp256 signature");
  const inner = string();
  if (at !== blob.length) throw new Error("trailing bytes after the signature");
  let k = 0;
  const innerView = new DataView(inner.buffer, inner.byteOffset, inner.length);
  const component = (name: string): Uint8Array => {
    if (k + 4 > inner.length) throw new Error(`${name} truncated`);
    const n = innerView.getUint32(k, false);
    k += 4;
    if (n > inner.length - k) throw new Error(`${name} truncated`);
    const m = inner.subarray(k, k + n);
    k += n;
    if (m.length === 0) throw new Error(`${name} is empty`);
    if ((m[0] & 0x80) !== 0) throw new Error(`${name} reads as negative: top bit set and no 0x00 sign pad`);
    if (m.length > 1 && m[0] === 0 && (m[1] & 0x80) === 0) throw new Error(`${name} has an unneeded leading 0x00`);
    return Uint8Array.from(stripLeadingZeros(m));
  };
  const r = component("r");
  const s = component("s");
  if (k !== inner.length) throw new Error("trailing bytes inside the signature");
  return { r, s };
}

/** r and s back to the 64 raw bytes WebCrypto verifies. Throws if either is wider than 32 bytes. */
export function rsToRaw(r: Uint8Array, s: Uint8Array): Uint8Array {
  if (r.length > 32 || s.length > 32) throw new Error("r or s wider than 32 bytes");
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}

// ───────────────────────────── for the byte figure ────────────────────────

/** Which part of the signature a byte belongs to. Fields with the same key mean the same thing in DER and in the SSH blob. */
export type FieldKey = "wrap" | "hdr-r" | "pad-r" | "val-r" | "hdr-s" | "pad-s" | "val-s";

export interface Field {
  key: FieldKey;
  /** What this run of bytes is, in the format's own words. */
  name: string;
  /** Byte offsets, end exclusive. */
  start: number;
  end: number;
}

function intFields(who: "r" | "s", content: Uint8Array, hdrStart: number, hdrEnd: number, hdrName: string): Field[] {
  const padded = content.length > 1 && content[0] === 0;
  const fields: Field[] = [{ key: `hdr-${who}`, name: hdrName, start: hdrStart, end: hdrEnd }];
  let at = hdrEnd;
  if (padded) {
    fields.push({ key: `pad-${who}`, name: "0x00 sign pad", start: at, end: at + 1 });
    at += 1;
  }
  fields.push({ key: `val-${who}`, name: `${who} value`, start: at, end: hdrEnd + content.length });
  return fields;
}

/** Labelled runs of a DER ECDSA signature, in order, covering every byte. Throws on malformed DER. */
export function derFields(der: Uint8Array): Field[] {
  derToRs(der); // same strictness as the app
  const lenBytes = (at: number) => ((der[at] & 0x80) === 0 ? 1 : 1 + (der[at] & 0x7f));
  const seqHdrEnd = 1 + lenBytes(1);
  const fields: Field[] = [{ key: "wrap", name: "SEQUENCE tag and length", start: 0, end: seqHdrEnd }];
  let at = seqHdrEnd;
  for (const who of ["r", "s"] as const) {
    const lb = lenBytes(at + 1);
    const len = lb === 1 ? der[at + 1] : lb === 2 ? der[at + 2] : (der[at + 2] << 8) | der[at + 3];
    const hdrEnd = at + 1 + lb;
    fields.push(...intFields(who, der.subarray(hdrEnd, hdrEnd + len), at, hdrEnd, `INTEGER tag and length (${who})`));
    at = hdrEnd + len;
  }
  return fields;
}

/** Labelled runs of an SSH ECDSA signature blob, in order, covering every byte. Throws on a malformed blob. */
export function sshFields(blob: Uint8Array): Field[] {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.length);
  const typeLen = view.getUint32(0, false);
  const innerAt = 4 + typeLen;
  const innerLen = view.getUint32(innerAt, false);
  if (innerAt + 4 + innerLen !== blob.length) throw new Error("blob length does not add up");
  const fields: Field[] = [{ key: "wrap", name: "key type string and length of what follows", start: 0, end: innerAt + 4 }];
  let at = innerAt + 4;
  for (const who of ["r", "s"] as const) {
    const n = view.getUint32(at, false);
    const hdrEnd = at + 4;
    fields.push(...intFields(who, blob.subarray(hdrEnd, hdrEnd + n), at, hdrEnd, `length (${who})`));
    at = hdrEnd + n;
  }
  if (at !== blob.length) throw new Error("trailing bytes");
  return fields;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "");
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) throw new Error("not hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
