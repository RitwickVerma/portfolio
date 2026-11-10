import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import {
  Limiter,
  AddressCooldown,
  agentRefusal,
  derToRs,
  derEncode,
  mpint,
  signatureBlob,
  signatureBlobWithoutSignPad,
  parseSignatureBlob,
  rawToDer,
  rsToRaw,
  derFields,
  sshFields,
  toHex,
  fromHex,
  QUIET_AFTER_APPROVAL_MS,
  COOLDOWN_TRUSTED_MS,
  COOLDOWN_PENDING_MS,
  COOLDOWN_V1_MS,
  GLOBAL_LIMIT,
  GLOBAL_WINDOW_MS,
  CHALLENGE_BYTES,
  KEY_TYPE,
} from "./sudostamp";

// Vectors: the unit tests of the SudoStamp repo (LimiterTest.kt, SshSigTest.kt
// and CooldownTest.kt as of v1.3.0), ported case for case. Where the Kotlin
// test used a private address or a JVM-only helper, the comment says what
// replaced it.

const subtle = webcrypto.subtle;

function big(decimal: string): Uint8Array {
  const hex = BigInt(decimal).toString(16);
  return fromHex(hex.length % 2 ? `0${hex}` : hex);
}

describe("Limiter (LimiterTest.kt)", () => {
  let t = 1_000_000;
  const make = () => {
    t = 1_000_000;
    return new Limiter(() => t);
  };

  it("a request right behind an approval is not put to the user", () => {
    const l = make();
    // The "sudo asked twice" attack: a second request queued behind the real one.
    l.approved();
    expect(l.refusal("a")).not.toBeNull();
    expect(l.refusal("b"), "whichever computer it names").not.toBeNull();
    t += QUIET_AFTER_APPROVAL_MS;
    expect(l.refusal("a")).toBeNull();
  });

  it("a denial cools that computer down - briefly when trusted, longer when new", () => {
    const l = make();
    l.unapproved("trusted", true);
    l.unapproved("new", false);
    expect(l.refusal("trusted")).not.toBeNull();
    expect(l.refusal("new")).not.toBeNull();
    expect(l.refusal("other"), "others are unaffected").toBeNull();
    t += COOLDOWN_TRUSTED_MS;
    expect(l.refusal("trusted"), "a mistaken Deny can be retried").toBeNull();
    expect(l.refusal("new")).not.toBeNull();
    t += COOLDOWN_PENDING_MS;
    expect(l.refusal("new")).toBeNull();
  });

  it("too many unapproved requests overall silence everything for a while", () => {
    const l = make();
    // Keyed by computer, not IP address: changing addresses does not help, and many
    // computers together are capped too.
    for (let i = 0; i < GLOBAL_LIMIT; i++) {
      l.unapproved(`host${i}`, true);
      t += COOLDOWN_TRUSTED_MS;
    }
    expect(l.refusal("fresh")).not.toBeNull();
    t += GLOBAL_WINDOW_MS;
    expect(l.refusal("fresh")).toBeNull();
  });

  it("forgetting a computer clears its cooldown", () => {
    const l = make();
    l.unapproved("gone", false);
    l.forget("gone");
    expect(l.refusal("gone")).toBeNull();
  });

  it("pins the constants and the order of the checks", () => {
    expect([QUIET_AFTER_APPROVAL_MS, COOLDOWN_TRUSTED_MS, COOLDOWN_PENDING_MS, GLOBAL_LIMIT, GLOBAL_WINDOW_MS]).toEqual([3_000, 5_000, 60_000, 4, 600_000]);
    const l = make();
    // quiet wins over the global cap, which wins over the per-computer cooldown
    for (let i = 0; i < GLOBAL_LIMIT; i++) l.unapproved("x", false);
    expect(l.refusal("x")).toMatch(/too many/);
    l.approved();
    expect(l.refusal("x")).toMatch(/just approved/);
    t += QUIET_AFTER_APPROVAL_MS;
    t += GLOBAL_WINDOW_MS - QUIET_AFTER_APPROVAL_MS;
    expect(l.refusal("x"), "the window has passed and so has the cooldown").toBeNull();
  });

  it("the window ends exactly when the oldest of the four leaves it", () => {
    const l = make();
    for (let i = 0; i < GLOBAL_LIMIT; i++) {
      l.unapproved(`h${i}`, true);
      t += 1_000;
    }
    expect(l.refusal("fresh")).toMatch(/too many/);
    t = 1_000_000 + GLOBAL_WINDOW_MS - 1;
    expect(l.refusal("fresh")).toMatch(/too many/);
    t = 1_000_000 + GLOBAL_WINDOW_MS;
    expect(l.refusal("fresh")).toBeNull();
  });

  it("snapshot shows the state the decision was made from, and cannot change it", () => {
    const l = make();
    l.approved();
    l.unapproved("a", false);
    const snap = l.snapshot();
    expect(snap.quietUntil).toBe(1_003_000);
    expect(snap.until).toEqual([["a", 1_060_000]]);
    expect(snap.recent).toEqual([1_000_000]);
    snap.recent.push(1);
    snap.until.length = 0;
    expect(l.snapshot().recent).toEqual([1_000_000]);
  });
});

describe("AddressCooldown, the 1.3.0 per-address cooldown (CooldownTest.kt)", () => {
  // The Kotlin test used 10.0.0.x addresses; these are documentation addresses (RFC 3849).
  const A9 = "2001:db8::9";
  let t = 1_000;
  const make = () => {
    t = 1_000;
    return new AddressCooldown(30_000, () => t);
  };

  it("an unknown host is silenced after an unapproved request, then released", () => {
    const c = make();
    expect(c.active(A9, false)).toBe(false);
    c.unapproved(A9, false);
    expect(c.active(A9, false)).toBe(true);
    t += 29_999;
    expect(c.active(A9, false)).toBe(true);
    t += 1;
    expect(c.active(A9, false), "released after the window").toBe(false);
  });

  it("a known host is never silenced", () => {
    const c = make();
    c.unapproved("2001:db8::2", true);
    expect(c.active("2001:db8::2", true)).toBe(false);
    // Even a cooldown recorded while it was still unknown does not block it once known.
    c.unapproved("2001:db8::3", false);
    expect(c.active("2001:db8::3", true)).toBe(false);
  });

  it("other hosts are unaffected", () => {
    const c = make();
    c.unapproved(A9, false);
    expect(c.active("2001:db8::10", false)).toBe(false);
  });

  it("memory stays bounded under an address flood", () => {
    const c = make();
    const addr = (n: number) => `2001:db8::${(n >> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
    for (let n = 0; n < 10_000; n++) c.unapproved(addr(n), false);
    // The most recent are still silenced: the bound evicts the oldest entries.
    expect(c.active(addr(9_999), false)).toBe(true);
    expect(c.snapshot().length).toBeLessThanOrEqual(256);
  });

  it("the default window is the 30 s of 1.3.0", () => {
    expect(COOLDOWN_V1_MS).toBe(30_000);
  });

  it("rotating the address walks round the cooldown: every new address is unknown and not yet silenced", () => {
    const c = make();
    let asked = 0;
    for (let n = 0; n < 20; n++) {
      const addr = `2001:db8::b:${n}`;
      if (!c.active(addr, false)) {
        asked++;
        c.unapproved(addr, false);
      }
      t += 1_000;
    }
    expect(asked, "every request was put to the user").toBe(20);
    // The same address, tried again straight away, is refused.
    expect(c.active("2001:db8::b:19", false)).toBe(true);
  });
});

describe("agentRefusal (AgentProtocol.kt)", () => {
  it("refuses before asking: an unknown key, or anything but 32 bytes", () => {
    expect(CHALLENGE_BYTES).toBe(32);
    expect(agentRefusal(true, new Uint8Array(32))).toBeNull();
    expect(agentRefusal(true, new Uint8Array(31))).toBe("refusing to sign 31 bytes: not a pam_rssh challenge");
    expect(agentRefusal(true, new Uint8Array(100))).toBe("refusing to sign 100 bytes: not a pam_rssh challenge");
    expect(agentRefusal(true, new Uint8Array(0))).toMatch(/0 bytes/);
    expect(agentRefusal(false, new Uint8Array(32))).toMatch(/did not make for any paired computer/);
    expect(agentRefusal(false, new Uint8Array(100)), "the key is checked first").toMatch(/did not make/);
  });
});

describe("SshSig (SshSigTest.kt)", () => {
  it("derToRs recovers the original r and s", () => {
    const r = big("12345678901234567890123456789012345678901234567890");
    const s = big("98765432109876543210987654321098765432109876543210");
    const got = derToRs(derEncode(r, s));
    expect(toHex(got.r)).toBe(toHex(r));
    expect(toHex(got.s)).toBe(toHex(s));
  });

  it("derToRs rejects malformed input instead of guessing", () => {
    const bad: [string, Uint8Array][] = [
      ["empty", new Uint8Array(0)],
      ["truncated", Uint8Array.of(0x30, 0x06, 0x02, 0x01)],
      ["not-a-sequence", Uint8Array.of(0x31, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x01)],
      ["zero-r", Uint8Array.of(0x30, 0x06, 0x02, 0x01, 0x00, 0x02, 0x01, 0x01)],
      ["zero-s", Uint8Array.of(0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x00)],
      ["trailing-bytes", Uint8Array.of(0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x01, 0x00)],
      ["seq-len-too-short", Uint8Array.of(0x30, 0x05, 0x02, 0x01, 0x01, 0x02, 0x01, 0x01)],
      ["seq-len-too-long", Uint8Array.of(0x30, 0x07, 0x02, 0x01, 0x01, 0x02, 0x01, 0x01)],
      ["truncated-long-length", Uint8Array.of(0x30, 0x82, 0x00)],
      ["integer-too-wide", (() => {
        const wide = new Uint8Array(34);
        wide[0] = 0x01; // 1 shl 270 is 34 bytes, as in the Kotlin test
        return derEncode(wide, Uint8Array.of(1));
      })()],
      ["zero-length-integer", Uint8Array.of(0x30, 0x06, 0x02, 0x00, 0x02, 0x02, 0x01, 0x01)],
    ];
    for (const [name, der] of bad) expect(() => signatureBlob(der), `must reject ${name}`).toThrow();
  });

  it("mpint: minimal, with a 0x00 in front exactly when the top bit is set", () => {
    expect(toHex(mpint(Uint8Array.of(0x7f)))).toBe("7f");
    expect(toHex(mpint(Uint8Array.of(0x80)))).toBe("0080");
    expect(toHex(mpint(Uint8Array.of(0x00, 0x00, 0x01)))).toBe("01");
    expect(toHex(mpint(Uint8Array.of(0xff, 0x00)))).toBe("00ff00");
  });

  it("a known conversion, checked by hand", () => {
    // r = 0x80 (needs a pad), s = 0x7f (does not)
    const der = Uint8Array.of(0x30, 0x07, 0x02, 0x02, 0x00, 0x80, 0x02, 0x01, 0x7f);
    expect(toHex(signatureBlob(der))).toBe(
      "00000013" + toHex(new TextEncoder().encode(KEY_TYPE)) + "0000000b" + "00000002" + "0080" + "00000001" + "7f",
    );
  });

  it("signature blob wraps r and s correctly, for real P-256 signatures", async () => {
    const kp = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
    const msg = new TextEncoder().encode("hello");
    const raw = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, msg));
    const der = rawToDer(raw);
    const blob = signatureBlob(der);
    const dv = new DataView(blob.buffer);
    expect(dv.getUint32(0)).toBe(19);
    expect(new TextDecoder().decode(blob.subarray(4, 23))).toBe(KEY_TYPE);
    expect(dv.getUint32(23)).toBe(blob.length - 27);
    const { r, s } = parseSignatureBlob(blob);
    expect(toHex(rsToRaw(r, s))).toBe(toHex(raw));
    expect(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, rsToRaw(r, s), msg)).toBe(true);
  });

  it("every real signature survives the DER round trip, in both 32- and 33-byte forms", async () => {
    const kp = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
    const sizes = new Set<number>();
    for (let n = 0; n < 400; n++) {
      const msg = Uint8Array.of(n & 0xff, n >> 8);
      const raw = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, msg));
      const der = rawToDer(raw);
      const { r, s } = derToRs(der);
      expect(toHex(derEncode(r, s)), "re-encoding is identical").toBe(toHex(der));
      expect(toHex(rsToRaw(r, s))).toBe(toHex(raw));
      sizes.add(mpint(r).length);
    }
    expect(sizes.has(33), `saw a 33-byte (sign-padded) r: ${[...sizes]}`).toBe(true);
    expect(sizes.has(32), `saw a 32-byte r: ${[...sizes]}`).toBe(true);
  });

  it("the shortcut without the sign pad is refused exactly when a top bit is set", async () => {
    const kp = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
    let refused = 0;
    let passed = 0;
    for (let n = 0; n < 100; n++) {
      const raw = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, Uint8Array.of(n)));
      const der = rawToDer(raw);
      const { r, s } = derToRs(der);
      const needsPad = (r[0] & 0x80) !== 0 || (s[0] & 0x80) !== 0;
      const naive = signatureBlobWithoutSignPad(der);
      if (needsPad) {
        expect(() => parseSignatureBlob(naive)).toThrow(/negative/);
        expect(toHex(naive)).not.toBe(toHex(signatureBlob(der)));
        refused++;
      } else {
        expect(toHex(naive)).toBe(toHex(signatureBlob(der)));
        passed++;
      }
    }
    expect(refused).toBeGreaterThan(0);
    expect(passed).toBeGreaterThan(0);
  });

  it("parseSignatureBlob is as strict as the app's DER reader", () => {
    const good = signatureBlob(Uint8Array.of(0x30, 0x06, 0x02, 0x01, 0x05, 0x02, 0x01, 0x07));
    expect(parseSignatureBlob(good).r).toEqual(Uint8Array.of(5));
    expect(() => parseSignatureBlob(good.subarray(0, good.length - 1))).toThrow();
    expect(() => parseSignatureBlob(Uint8Array.of(...good, 0))).toThrow(/trailing/);
    const padless = signatureBlobWithoutSignPad(Uint8Array.of(0x30, 0x07, 0x02, 0x02, 0x00, 0x80, 0x02, 0x01, 0x01));
    expect(() => parseSignatureBlob(padless)).toThrow(/r reads as negative/);
  });

  it("derFields and sshFields cover every byte once, in order, and agree on the pad", () => {
    for (const hex of ["30070202008002017f", "3006020105020107", "3008020200ff0202008f"]) {
      const der = fromHex(hex);
      const blob = signatureBlob(der);
      for (const [bytes, fields] of [[der, derFields(der)], [blob, sshFields(blob)]] as const) {
        let at = 0;
        for (const f of fields) {
          expect(f.start, `${hex} ${f.name}`).toBe(at);
          expect(f.end).toBeGreaterThan(f.start);
          at = f.end;
        }
        expect(at).toBe(bytes.length);
      }
      const keys = (fs: { key: string }[]) => fs.map((f) => f.key).sort();
      expect(keys(derFields(der)).filter((k) => k.startsWith("pad"))).toEqual(keys(sshFields(blob)).filter((k) => k.startsWith("pad")));
    }
  });
});

describe("SshSig against signatures made by OpenSSH (ssh-keygen -Y sign, throwaway keys)", () => {
  // Public data only: the public point, the data that was signed and the signature blob.
  // Each case has a different combination of sign pads on r and s.
  const VECTORS: { rPad: boolean; sPad: boolean; q: string; signed: string; blob: string }[] = [
  {
    rPad: true,
    sPad: true,
    q: "0429e8ce0932616e747f8c700dc9599bd6025fb3f4cda67402cf0578d051783baa9faf519ecb17bd23607bc9b609b0166d849727aba85fb70182f07e6a87676d16",
    signed: "53534853494700000006766563746f72000000000000000673686135313200000040e23b7b4058884f33d66477b96517e622a655858d1f96c94fb8068f1cce4c9511dd92ee8920603b1cce9fe5a2288e788914338f37798db8fe59450c909248f164",
    blob: "0000001365636473612d736861322d6e697374703235360000004a00000021009f60d605b1a00488e1911d980f8bfa563643a5e50c54120cec12cc845426bd280000002100b365c0d922339fa4e6e0b41c17dbac1cc59c4d7288912797d94316d176b4ba62",
  },
  {
    rPad: true,
    sPad: false,
    q: "04b00c3b52ba00ef8a25fe6577ad7ecc28b53abc989b342f6f2f3ff7a1483ff3b9516d120f937a3dc2c047a535e73de719c80266de07c3fb1a52ed9ab1e54e04c4",
    signed: "53534853494700000006766563746f72000000000000000673686135313200000040a81b63ae2b18370cffeeb01810beb6ec405bb0766bbd76d36fa2a374e193658c95ac3ffa258517ecea7551cd6be11b6804aa735e4f33ac27d367304e6bd789b7",
    blob: "0000001365636473612d736861322d6e69737470323536000000490000002100abad4dd3a4984bb441440e4b4efa4515a34669ddfb64ce8513b0e4257cfc6eb20000002024fb84185358f308f0cad7e053b409ec9dc8c447a6b9bf0d840787f3b8964a8a",
  },
  {
    rPad: false,
    sPad: true,
    q: "04e467a7186d96efb6fb9b78ab8cd0e1582deba0cb5e97444ec90433842e262452997ab5b9165ff641c853e371addf3aeb2f1676eef81fe16468ee1de92819ab32",
    signed: "53534853494700000006766563746f72000000000000000673686135313200000040ec001853e20bb70f80c326a9a21847c8691fb2d93acdc2d54cccc0c614387cb2f4ae4971e144074c3ad58804563ee66f5a55de67e15946cde3c4a1d16c8896ec",
    blob: "0000001365636473612d736861322d6e6973747032353600000049000000203a785140066a3cac7923e5e4216cf1c18bbd2b063f44c536d0e721af41f0bc950000002100a44d29c2c4fa8a0ffeacd3c41150a1422997d05ec04efc10dbca02b61b176833",
  },
  {
    rPad: false,
    sPad: false,
    q: "0406a8255960c9f1ba954c41ba727363dd53aa27d8bdfb4aaf18159ebc2921c4851266f32082849aaac570b0bab80e56751caf68588cdc0469d4fe4cb759ec32c4",
    signed: "53534853494700000006766563746f72000000000000000673686135313200000040173ab7af1589d4ee79475f53ace4a5caefa0d9717c1be9acf9746f34eb2fbe6cd6dd2f08d6c3bc7bfc480ba6093d11588d5446164940f229c2b4331c23c175e1",
    blob: "0000001365636473612d736861322d6e6973747032353600000048000000206646e5b4d6669365b855ac31cf889328d965f2b9901bffbb90e30e2f9050df21000000200265eefa4e740699b68375c81d03a8b072f18d6600c8940ed1594db5376c9545",
  },
  ];

  for (const v of VECTORS) {
    it(`r pad ${v.rPad}, s pad ${v.sPad}: read, re-encoded identically and verified`, async () => {
      const blob = fromHex(v.blob);
      const { r, s } = parseSignatureBlob(blob);
      expect((blob.length - 27 - 8 - r.length - s.length) >= 0).toBe(true);
      // Our encoder reproduces OpenSSH's bytes from the DER the Keystore would give.
      expect(toHex(signatureBlob(derEncode(r, s)))).toBe(v.blob);
      // The fields say what the bytes say.
      const pads = sshFields(blob).filter((f) => f.key.startsWith("pad")).map((f) => f.key);
      expect(pads).toEqual([...(v.rPad ? ["pad-r"] : []), ...(v.sPad ? ["pad-s"] : [])]);
      // And the numbers are a real signature: an independent verifier accepts them.
      const key = await subtle.importKey("raw", fromHex(v.q), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      expect(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, rsToRaw(r, s), fromHex(v.signed))).toBe(true);
    });
  }
});
