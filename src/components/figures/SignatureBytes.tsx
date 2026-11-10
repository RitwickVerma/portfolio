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
import { Actions, FigureFrame, Fold, Presets, Segmented, Verdict } from "./kit";

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
  { key: "pad-r", who: "r", name: "Extra 00 on r (sign pad)" },
  { key: "val-r", who: "r", name: "r" },
  { key: "hdr-s", who: "s", name: "Length of s" },
  { key: "pad-s", who: "s", name: "Extra 00 on s (sign pad)" },
  { key: "val-s", who: "s", name: "s" },
];

const NOTE: Record<string, string> = {
  wrap: "DER wraps the two numbers in a SEQUENCE: tag 0x30 and a length. SSH wraps them in two strings: the key type, then the length of what follows.",
  hdr: "DER gives the integer a tag (0x02) and a one-byte length. SSH gives it a four-byte length and no tag.",
  pad: "A 0x00 goes in front when the top bit is set, so a two's-complement reader does not see a negative number. DER and SSH use the same rule.",
  val: "The number itself, big-endian, shortest form.",
};

const BUILD: readonly { id: "with" | "without"; label: string }[] = [
  { id: "with", label: "with the extra byte (the app)" },
  { id: "without", label: "without it (the bug)" },
];

type PresetId = "fail" | "until";
const PRESETS: readonly { id: PresetId; label: string }[] = [
  { id: "fail", label: "Show it failing" },
  { id: "until", label: "Keep signing until it needs the extra byte" },
];

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

function labelOf(f: Field): string {
  const [kind, who] = f.key.split("-");
  if (kind === "val") return `${who}, ${f.end - f.start} bytes`;
  if (kind === "hdr") return `length of ${who}`;
  if (kind === "pad") return "extra byte";
  return "wrapper";
}

function Strip({
  title,
  bytes,
  fields,
  active,
  missing = [],
  onHover,
  onPin,
}: {
  title: string;
  bytes: Uint8Array;
  fields: Field[];
  active: FieldKey | null;
  /** Numbers that needed an extra 00 and do not have it in this view. */
  missing?: ("r" | "s")[];
  onHover: (k: FieldKey | null) => void;
  onPin: (k: FieldKey) => void;
}) {
  return (
    <div>
      <p className="fact pb-1">{title}</p>
      <div role="group" aria-label={`${title}, hex`} className="flex flex-wrap">
        {fields.map((f) => {
          const on = active === f.key;
          const pad = f.key.startsWith("pad-");
          return (
            <span key={`${f.key}-${f.start}`} className="contents">
              {f.key.startsWith("val-") && missing.includes(f.key.slice(4) as "r" | "s") && (
                <span data-missing="true" className="flex flex-col border-l border-dashed border-warn px-1.5 pt-0.5 pb-1 mb-1">
                  <span className="fact text-[0.75rem] leading-4 whitespace-nowrap text-warn">00 missing</span>
                  <span className="font-mono text-[0.75rem] leading-5 text-warn">··</span>
                </span>
              )}
              <span
                data-pad={pad ? "true" : undefined}
                onMouseEnter={() => onHover(f.key)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onPin(f.key)}
                className={`flex max-w-full flex-col border-l border-fg/40 px-1.5 pt-0.5 pb-1 mb-1 cursor-pointer ${on || pad ? "bg-hit text-ink" : ""} ${pad ? "font-semibold" : ""}`}
              >
                <span aria-hidden="true" className={`fact text-[0.75rem] leading-4 whitespace-nowrap ${on || pad ? "!text-ink" : ""}`}>
                  {labelOf(f)}
                </span>
                <Hex bytes={bytes.subarray(f.start, f.end)} />
              </span>
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
  const [preset, setPreset] = useState<PresetId | null>(null);
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

  const who = [needs.r ? "r" : null, needs.s ? "s" : null].filter((x): x is string => x !== null);
  const needText = who.length === 2 ? "Both numbers start with a byte of 0x80 or more" : `${who[0]} starts with a byte of 0x80 or more`;

  // The verdict is a plain sentence; the computed part is the WebCrypto check.
  let verdictTone: "ok" | "warn" | "plain" = "plain";
  let verdictTitle: string;
  let verdictBody: string;
  if (signed.source === "vector") {
    verdictTitle = "These are example numbers, not a signature";
    verdictBody = "They come from the app's unit test. Press “Sign another value” to make a real signature in this tab.";
  } else if (!read.ok) {
    verdictTone = "warn";
    verdictTitle = "Without the extra byte, the computer rejects this signature";
    verdictBody = `A reader that follows the rules refuses the blob: ${read.error}. The 00 is missing in front of ${who.join(" and ")}.`;
  } else if (skipPad && !needs.r && !needs.s) {
    verdictTitle = "Nothing was left out: this signature did not need the extra byte";
    verdictBody = "Sign again, or press “Keep signing until it needs the extra byte”.";
  } else if (verdict?.blob === blobHex) {
    verdictTone = verdict.ok ? "ok" : "warn";
    verdictTitle = verdict.ok
      ? who.length > 0
        ? "This signature needed the extra byte, and it verified"
        : "This signature did not need the extra byte, and it verified"
      : "This signature did not verify";
    verdictBody = `Read back from the blob and checked against this tab's public key with WebCrypto: ${verdict.ok ? "valid" : "not valid"}.${who.length > 0 ? ` ${needText}, so a 00 byte goes in front, or it would read as a negative number.` : ""}`;
  } else {
    verdictTitle = "Checking the signature";
    verdictBody = "Checking against this tab's public key with WebCrypto.";
  }

  const padNote = (w: "r" | "s") => {
    const first = rs[w][0].toString(16).padStart(2, "0");
    return needs[w] ? ` Here ${w} starts 0x${first}: top bit set, so it needs the pad.` : ` Here ${w} starts 0x${first}: top bit clear, so no pad.`;
  };

  const pinToggle = (k: FieldKey) => setPin((p) => (p === k ? null : k));
  const missing = skipPad ? (["r", "s"] as const).filter((w) => needs[w]) : [];

  return (
    <FigureFrame
      claim="One missing zero byte and the signature fails"
      how="Press “Show it failing”: the figure signs until a signature needs an extra 00 byte, leaves that byte out, and the computer rejects it."
      caption="The key lives in this tab's memory, not the phone's hardware, and “without it” is a bug the app avoids, built here to show what it does."
      about={
        <>
          <p>
            The key and the signature are made in your browser just now, and the figure checks the blob against the public key. Two differences from the phone: WebCrypto returns r and s as 64 raw bytes, not DER, so the figure encodes the DER the way Java&apos;s Signature does
            before running the same conversion as the app; and this key lives in memory, not in the Keystore&apos;s hardware.
          </p>
          <p>
            Switching to &ldquo;without it&rdquo; is not in the app: it is the bug the app&apos;s comments warn about. Before JavaScript runs, or without WebCrypto, the figure shows the unit test&apos;s own numbers; they are not a signature.
          </p>
        </>
      }
    >
      <Actions>
        <button type="button" className="btn" disabled={busy} onClick={() => {
            setPreset(null);
            void sign(false);
          }}>
          Sign another value
        </button>
      </Actions>
      <Presets
        label="Try"
        items={PRESETS}
        active={preset}
        onPick={(id) => {
          setPreset(id);
          setSkipPad(id === "fail");
          void sign(true);
        }}
      />
      <Segmented<"with" | "without">
        label="The computer is sent the signature"
        options={BUILD}
        value={skipPad ? "without" : "with"}
        onChange={(v) => {
          setPreset(null);
          setSkipPad(v === "without");
        }}
      />
      {problem && <p className="fact text-warn">{problem}</p>}

      <div>
        <p className="fact pb-2">
          {signed.source === "browser" ? "Signed just now in this tab by a P-256 key that was made here." : "Test vector from the app's unit test (SshSigTest.kt), shown until this tab signs something."}
        </p>
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          <Strip title={`What the phone returns (DER): ${signed.der.length} bytes`} bytes={signed.der} fields={derF} active={active} onHover={setHover} onPin={pinToggle} />
          <Strip
            title={`What the computer is sent (SSH blob)${skipPad ? ", extra byte left out" : ""}: ${blob.length} bytes`}
            bytes={blob}
            fields={sshF}
            active={active}
            missing={[...missing]}
            onHover={setHover}
            onPin={pinToggle}
          />
        </div>
      </div>

      <Verdict tone={verdictTone} title={verdictTitle}>
        {verdictBody}
      </Verdict>

      <Fold summary="Every field, and what WebCrypto returned">
        <div className="space-y-4">
          {signed.message && (
            <div>
              <p className="fact">Signed value, 32 random bytes like a pam_rssh challenge</p>
              <p className="font-mono text-[0.75rem] leading-5 break-all">{toHex(signed.message)}</p>
            </div>
          )}
          {rawFields && signed.raw && <Strip title={`What WebCrypto returned: ${signed.raw.length} bytes, r then s`} bytes={signed.raw} fields={rawFields} active={active} onHover={setHover} onPin={pinToggle} />}
          <ul className="divide-y divide-border" aria-label="Fields of the signature">
            {ROWS.map(({ key, who: w, name }) => {
              const d = derF.filter((f) => f.key === key);
              const s = sshF.filter((f) => f.key === key);
              const kind = key.split("-")[0];
              const on = active === key;
              return (
                <li key={key} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)} className={`py-2.5 ${on ? "bg-hit text-ink" : ""}`}>
                  <p className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                    <button
                      type="button"
                      aria-pressed={pin === key}
                      onFocus={() => setFocus(key)}
                      onBlur={() => setFocus(null)}
                      onClick={() => pinToggle(key)}
                      className="font-semibold text-left underline decoration-current/40 underline-offset-4 min-h-11 sm:min-h-9"
                    >
                      {name}
                    </button>
                    <span className={`fact ${on ? "!text-ink" : ""}`}>
                      DER bytes {range(d)}, SSH bytes {range(s)}
                    </span>
                  </p>
                  <p className={`fact mt-0.5 ${on ? "!text-ink" : ""}`}>
                    {NOTE[kind]}
                    {kind === "pad" && w ? padNote(w) : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </Fold>
    </FigureFrame>
  );
}
