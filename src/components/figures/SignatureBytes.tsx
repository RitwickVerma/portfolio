"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  derEncode,
  derFields,
  derToRs,
  fromHex,
  parseSignatureBlob,
  rawToDer,
  rsToRaw,
  signatureBlob,
  signatureBlobWithoutSignPad,
  sshFields,
  toHex,
  type Field,
  type FieldKey,
} from "@/lib/sudostamp";

// What SshSig.signatureBlob does, on bytes you can see. A P-256 key is made in
// this tab with WebCrypto and signs 32 random bytes; the signature is shown as
// DER (the form Android Keystore returns) and as the SSH blob the agent sends,
// field by field, with the same field lit in both. The blob is then read back
// the way a verifier reads it and checked against the public key, so "valid"
// is computed, not drawn.
//
// Before JavaScript runs (and if WebCrypto is missing) it shows the unit test's
// own numbers from the SudoStamp repo instead. They are not a signature.

// SshSigTest.kt `derToRs recovers the original r and s`:
// r = 12345678901234567890123456789012345678901234567890, s = 98765432109876543210987654321098765432109876543210
const VECTOR_R = "08727f6369aaf83ca15026747af8c7f196ce3f0ad2";
const VECTOR_S = "4393fb25a23480e82908ce2957cfb667d751c67eea";

interface Signed {
  source: "vector" | "browser";
  der: Uint8Array;
  /** What WebCrypto returned: r then s, 32 bytes each. */
  raw?: Uint8Array;
  message?: Uint8Array;
}

const ROWS: { key: FieldKey; who: "r" | "s" | null; name: string }[] = [
  { key: "wrap", who: null, name: "Wrapper" },
  { key: "hdr-r", who: "r", name: "Length of r" },
  { key: "pad-r", who: "r", name: "Sign pad on r" },
  { key: "val-r", who: "r", name: "r" },
  { key: "hdr-s", who: "s", name: "Length of s" },
  { key: "pad-s", who: "s", name: "Sign pad on s" },
  { key: "val-s", who: "s", name: "s" },
];

const NOTE: Record<string, string> = {
  wrap: "DER wraps the two numbers in a SEQUENCE: tag 0x30 and a length. SSH wraps them in two strings: the key type, then the length of what follows.",
  hdr: "DER gives the integer a tag (0x02) and a one-byte length. SSH gives it a four-byte length and no tag.",
  pad: "A 0x00 goes in front when the top bit is set, so a two's-complement reader does not see a negative number. DER and SSH use the same rule.",
  val: "The number itself, big-endian, shortest form.",
};

const SHORT: Record<string, string> = { wrap: "wrapper", hdr: "len", pad: "pad", val: "" };

function range(f: Field[] | undefined): string {
  if (!f || f.length === 0) return "none";
  const start = Math.min(...f.map((x) => x.start));
  const end = Math.max(...f.map((x) => x.end));
  return `${start === end - 1 ? start : `${start} to ${end - 1}`} (${end - start} B)`;
}

/** Hex with a place to break after every byte, so a long field wraps on a byte boundary and never scrolls. */
function Hex({ bytes }: { bytes: Uint8Array }) {
  return (
    <span className="font-mono text-[0.75rem] leading-5">
      {Array.from(bytes, (b, i) => (
        <span key={i}>
          {i > 0 && <wbr />}
          {b.toString(16).padStart(2, "0")}
        </span>
      ))}
    </span>
  );
}

function Strip({
  title,
  bytes,
  fields,
  active,
  onHover,
  onPin,
}: {
  title: string;
  bytes: Uint8Array;
  fields: Field[];
  active: FieldKey | null;
  onHover: (k: FieldKey | null) => void;
  onPin: (k: FieldKey) => void;
}) {
  return (
    <div className="pb-3">
      <p className="fact pb-1">{title}</p>
      <div role="group" aria-label={`${title}, hex`} className="flex flex-wrap">
        {fields.map((f) => {
          const on = active === f.key;
          const [kind, who] = f.key.split("-");
          const label = kind === "val" ? `${who}, ${f.end - f.start} B` : kind === "hdr" ? `${SHORT.hdr} ${who}` : kind === "pad" ? `pad ${who}` : SHORT.wrap;
          return (
            <span
              key={`${f.key}-${f.start}`}
              onMouseEnter={() => onHover(f.key)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onPin(f.key)}
              className={`flex max-w-full flex-col border-l border-fg/40 px-1.5 pt-0.5 pb-1 mb-1 cursor-pointer ${on ? "bg-hit text-ink" : ""}`}
            >
              <span aria-hidden="true" className={`fact text-[0.72rem] leading-4 whitespace-nowrap ${on ? "!text-ink" : ""}`}>
                {label}
              </span>
              <Hex bytes={bytes.subarray(f.start, f.end)} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function SignatureBytes() {
  const [signed, setSigned] = useState<Signed>(() => ({ source: "vector", der: derEncode(fromHex(VECTOR_R), fromHex(VECTOR_S)) }));
  const [skipPad, setSkipPad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [hover, setHover] = useState<FieldKey | null>(null);
  const [focus, setFocus] = useState<FieldKey | null>(null);
  const [pin, setPin] = useState<FieldKey | null>(null);
  const [verdict, setVerdict] = useState<{ blob: string; ok: boolean } | null>(null);
  const keys = useRef<CryptoKeyPair | null>(null);
  const active = hover ?? focus ?? pin;

  const sign = useCallback(async (untilPad: boolean) => {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      setProblem("This page has no WebCrypto (it needs a secure context), so the figure keeps the test vector.");
      return;
    }
    setBusy(true);
    try {
      if (!keys.current) keys.current = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
      let next: Signed | null = null;
      for (let i = 0; i < (untilPad ? 200 : 1); i++) {
        const message = globalThis.crypto.getRandomValues(new Uint8Array(32));
        const raw = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.current.privateKey, message));
        const der = rawToDer(raw);
        next = { source: "browser", der, raw, message };
        const { r, s } = derToRs(der);
        if ((r[0] & 0x80) !== 0 || (s[0] & 0x80) !== 0) break;
      }
      if (next) setSigned(next);
      setProblem(null);
    } catch (e) {
      setProblem(`WebCrypto refused: ${e instanceof Error ? e.message : String(e)}. The figure keeps what it had.`);
    } finally {
      setBusy(false);
    }
  }, []);

  // One signature when the page is up, so the figure shows a real one. It is the
  // only thing that happens without a click, and nothing on screen moves.
  useEffect(() => {
    const t = setTimeout(() => void sign(false), 0);
    return () => clearTimeout(t);
  }, [sign]);

  const blob = useMemo(() => (skipPad ? signatureBlobWithoutSignPad(signed.der) : signatureBlob(signed.der)), [signed, skipPad]);
  const blobHex = toHex(blob);
  const derF = useMemo(() => derFields(signed.der), [signed]);
  const sshF = useMemo(() => sshFields(blob), [blob]);
  const rs = useMemo(() => derToRs(signed.der), [signed]);
  const read = useMemo(() => {
    try {
      return { ok: true as const, ...parseSignatureBlob(blob) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }, [blob]);
  const needs = { r: (rs.r[0] & 0x80) !== 0, s: (rs.s[0] & 0x80) !== 0 };

  useEffect(() => {
    const pub = keys.current?.publicKey;
    if (signed.source !== "browser" || !signed.message || !pub || !read.ok) return;
    let cancelled = false;
    const message = signed.message;
    const raw = rsToRaw(read.r, read.s);
    globalThis.crypto.subtle
      .verify({ name: "ECDSA", hash: "SHA-256" }, pub, raw as BufferSource, message as BufferSource)
      .then((ok) => {
        if (!cancelled) setVerdict({ blob: blobHex, ok });
      })
      .catch(() => {
        if (!cancelled) setVerdict({ blob: blobHex, ok: false });
      });
    return () => {
      cancelled = true;
    };
  }, [signed, read, blobHex]);

  const rawFields: Field[] | null = signed.raw
    ? [
        { key: "val-r", name: "r", start: 0, end: 32 },
        { key: "val-s", name: "s", start: 32, end: 64 },
      ]
    : null;

  let result: string;
  if (signed.source === "vector") {
    result = "Not checked: these two numbers come from a unit test and are not a signature over anything.";
  } else if (!read.ok) {
    result = `A reader that follows the mpint rules refuses this blob: ${read.error}.`;
  } else if (skipPad && !needs.r && !needs.s) {
    result = "Leaving the pad out changes nothing for this signature: neither number has its top bit set. Sign again.";
  } else if (verdict?.blob === blobHex) {
    result = verdict.ok
      ? "Read back from the blob and checked against this tab's public key with WebCrypto: valid."
      : "Read back from the blob and checked against this tab's public key with WebCrypto: not valid.";
  } else {
    result = "Checking against this tab's public key.";
  }

  const padNote = (who: "r" | "s") => {
    const first = rs[who][0].toString(16).padStart(2, "0");
    return needs[who] ? ` Here ${who} starts 0x${first}: top bit set, so it needs the pad.` : ` Here ${who} starts 0x${first}: top bit clear, so no pad.`;
  };

  return (
    <figure className="my-8">
      <div className="border-2 border-fg rounded-[var(--r-box)]">
        <div className="p-4 border-b border-border">
          <p className="fact">
            {signed.source === "browser"
              ? "Signed just now in this tab by a P-256 key that was made here."
              : "Test vector from the app's unit test (SshSigTest.kt), shown until this tab signs something."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" className="btn" disabled={busy} onClick={() => void sign(false)}>
              Sign another 32-byte value
            </button>
            <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg" disabled={busy} onClick={() => void sign(true)}>
              Keep signing until a sign pad is needed
            </button>
            <button type="button" className="fact underline decoration-fg/30 underline-offset-4 hover:text-fg" aria-pressed={skipPad} onClick={() => setSkipPad((v) => !v)}>
              {skipPad ? "Put the sign pad back" : "Leave the sign pad out"}
            </button>
          </div>
          {problem && <p className="mt-3 fact text-warn">{problem}</p>}
        </div>

        <div className="p-4 border-b border-border">
          {signed.message && (
            <div className="pb-3">
              <p className="fact">Signed value, 32 random bytes like a pam_rssh challenge</p>
              <p className="font-mono text-[0.75rem] leading-5 break-all">{toHex(signed.message)}</p>
            </div>
          )}
          <div>
            {rawFields && signed.raw && (
              <Strip title={`What WebCrypto returned: ${signed.raw.length} bytes, r then s`} bytes={signed.raw} fields={rawFields} active={active} onHover={setHover} onPin={(k) => setPin((p) => (p === k ? null : k))} />
            )}
            <Strip title={`DER, as Android Keystore returns it: ${signed.der.length} bytes`} bytes={signed.der} fields={derF} active={active} onHover={setHover} onPin={(k) => setPin((p) => (p === k ? null : k))} />
            <Strip
              title={`SSH signature blob, as the agent sends it${skipPad ? " (sign pad left out)" : ""}: ${blob.length} bytes`}
              bytes={blob}
              fields={sshF}
              active={active}
              onHover={setHover}
              onPin={(k) => setPin((p) => (p === k ? null : k))}
            />
          </div>
          <p role="status" className={`mt-1 text-[0.95rem] ${!read.ok && signed.source === "browser" ? "text-warn" : verdict?.blob === blobHex && verdict.ok && read.ok ? "text-ok" : "text-fg/90"}`}>
            {result}
          </p>
        </div>

        <ul className="divide-y divide-border" aria-label="Fields of the signature">
          {ROWS.map(({ key, who, name }) => {
            const d = derF.filter((f) => f.key === key);
            const s = sshF.filter((f) => f.key === key);
            const kind = key.split("-")[0];
            const on = active === key;
            return (
              <li key={key} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)} className={`px-4 py-2.5 ${on ? "bg-hit text-ink" : ""}`}>
                <p className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                  <button
                    type="button"
                    aria-pressed={pin === key}
                    onFocus={() => setFocus(key)}
                    onBlur={() => setFocus(null)}
                    onClick={() => setPin((p) => (p === key ? null : key))}
                    className="font-semibold text-left underline decoration-current/40 underline-offset-4"
                  >
                    {name}
                  </button>
                  <span className={`fact ${on ? "!text-ink" : ""}`}>
                    DER bytes {range(d)}, SSH bytes {range(s)}
                  </span>
                </p>
                <p className={`fact mt-0.5 ${on ? "!text-ink" : ""}`}>
                  {NOTE[kind]}
                  {kind === "pad" && who ? padNote(who) : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="mt-3 fact">
        The key and the signature are made in your browser just now, and the figure checks the blob against the public key. Two differences from the phone: WebCrypto returns r and s as 64 raw bytes, not DER, so the figure encodes the DER the way Java&apos;s
        Signature does before running the same conversion as the app; and this key lives in memory, not in the Keystore&apos;s hardware. &ldquo;Leave the sign pad out&rdquo; is not in the app: it is the bug the app&apos;s comments warn about,
        built here to show what it does.
      </figcaption>
    </figure>
  );
}
