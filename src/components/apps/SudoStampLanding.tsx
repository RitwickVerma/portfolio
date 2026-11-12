import type { ReactNode } from "react";
import type { PublicApp } from "@/lib/apps";
import PhoneShot from "./PhoneShot";
import CopyButton from "./CopyButton";
import SudoStampDemo, { Fingerprint } from "./SudoStampDemo";
import { AppHeader, AppFooter, ext } from "./AppChrome";

// SudoStamp's page, in SudoStamp's own design system (Ui.kt): one near-black
// ground, cards on #141821 with a hairline outline and 20dp corners, sans for
// prose and mono only for code, green as the single accent, amber and red
// only where they mean something. Every claim is from the repository's
// README, SECURITY.md or release notes.

// Verbatim from the README's Setup section; injected by script, never retyped.
const SETUP = "curl -fsSLO https://gitlab.com/ritwick7/sudostamp/-/releases/permalink/latest/downloads/sudostamp-setup.sh\ncurl -fsSLO https://gitlab.com/ritwick7/sudostamp/-/releases/permalink/latest/downloads/sudostamp-setup.sh.sig\necho 'sudostamp-release namespaces=\"sudostamp-release\" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILytyVXX+Jze6AVLpKTLjHbktDqympGfBq9NPEAhwW4Y' > sudostamp.signers\nssh-keygen -Y verify -f sudostamp.signers -I sudostamp-release -n sudostamp-release -s sudostamp-setup.sh.sig < sudostamp-setup.sh && sudo bash sudostamp-setup.sh";
const CERT_SHA256 = "7bcb0b51246197b9bb99779e09a3adcbbaeb2d59a0edecf8d2e8be67844d0657";

const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-button)] px-5 text-[15px] font-medium transition-[background-color,border-color,color,transform] active:scale-[0.98]";
const PRIMARY = `${BTN} bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[#6EE7A0]`;
const GHOST = `${BTN} border border-[#33405A] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-hi)]`;
const CARD = "rounded-[var(--r-card)] border border-[var(--outline)] bg-[var(--surface)]";
const OVERLINE = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]";
const H2 = "mt-3 text-3xl font-semibold tracking-tight text-balance text-[var(--fg)] sm:text-[2.6rem] sm:leading-[1.1]";
const LEAD = "mt-5 max-w-2xl text-pretty text-[17px] leading-relaxed text-[var(--muted)]";
const SECTION = "mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24";
const LINK = "text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]";
const CODE = "rounded-md bg-[var(--surface-hi)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--fg)]";

// Icons drawn for this page, in the app's rounded line style.
function Glyph({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
const G = {
  pen: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  key: "M14.5 9.5a4 4 0 1 0-3.1 3.9L13 15h2v2h2v2h3v-3l-5.6-5.6c.07-.29.1-.59.1-.9zM8.5 9.5h.01",
  monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
  filter: "M4 5h16l-6 8v6l-4-2v-4z",
  box: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  unlock: "M7 11V7a5 5 0 0 1 9.6-2M5 11h14v10H5zM12 15v2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
};

const shots = [
  {
    src: "notification",
    n: "1",
    title: "You run sudo",
    body: "The phone pops up the name of the computer that is asking. Deny works right from the notification.",
    alt: "Notification shade: Approve sudo on Edith? From 127.0.0.1, tap to approve, with a Deny button",
  },
  {
    src: "approval",
    n: "2",
    title: "Tap it",
    body: "The app shows a countdown, the computer and the time, and warns about computers it has never seen. Then Android's fingerprint prompt appears.",
    alt: "Approval screen with a countdown ring, Approve sudo on Edith?, the requesting address and Approve and Deny buttons",
  },
  {
    src: "approved",
    n: "3",
    title: "Touch the sensor",
    body: "The secure hardware signs, sudo proceeds and the app closes itself.",
    alt: "Approved: sudo on Edith can proceed",
  },
];
const moreShots = [
  {
    src: "onboarding",
    title: "First run",
    body: "Three steps and one button. It offers fingerprint enrollment if the phone has none.",
    alt: "Onboarding: Approve sudo with a touch, three steps, Get started",
  },
  {
    src: "ready",
    title: "Setup checklist",
    body: "Listener, notifications, battery and Do Not Disturb. It says Ready only when all pass.",
    alt: "Setup screen: Ready, with Listener, Notifications and Battery checks all green",
  },
  {
    src: "denied",
    title: "Denied or timed out",
    body: "No signature leaves the phone, and sudo asks for your password instead.",
    alt: "Denied: No signature was sent. The host falls back to the password.",
  },
];

const flow = [
  { who: "Computer", what: "You run sudo.", detail: "PAM hands the request to pam_rssh, an existing, maintained module, which dials the phone over your LAN as an ssh-agent." },
  { who: "Phone", what: "Approve sudo on Edith?", detail: "A notification names the computer that is asking. A device that never paired cannot even make the phone ask." },
  { who: "You", what: "Touch the sensor.", detail: "Android's biometric prompt checks your fingerprint inside the phone's secure hardware. The app only learns yes or no." },
  { who: "Phone", what: "The secure hardware signs.", detail: "It signs pam_rssh's fresh 32-byte challenge with the key it made for that one computer, and sends the signature back." },
  { who: "Computer", what: "sudo proceeds.", detail: "pam_rssh checks the signature against the key you pinned when you paired. Anything else, and sudo asks for your password." },
];

const trust: { icon: string; title: string; body: string }[] = [
  {
    icon: G.pen,
    title: "The phone only signs. It never decides.",
    body: "PAM, signature checks and fail-closed behaviour are pam_rssh's job. The app's one helper on that path is a 4-second reachability check, and all it can do is send you to the password sooner.",
  },
  {
    icon: G.key,
    title: "The fingerprint is a hardware gate.",
    body: "Every signature needs a fresh strong biometric, enforced inside the TEE or StrongBox. Malware on the phone cannot sign without your finger, and the key cannot be exported.",
  },
  {
    icon: G.monitor,
    title: "One key per computer.",
    body: "The phone makes a separate key for every computer it pairs with, and each approval names the computer its key belongs to.",
  },
  {
    icon: G.filter,
    title: "It signs nothing but sudo challenges.",
    body: "Anything that is not exactly a 32-byte pam_rssh challenge is refused, so the keys are useless for SSH logins or git signing.",
  },
  {
    icon: G.box,
    title: "Zero third-party dependencies.",
    body: "Platform APIs only, no libraries at runtime. The whole release APK is about 110 KB.",
  },
  {
    icon: G.unlock,
    title: "It cannot lock you out.",
    body: "Phone off, out of range, Deny or 60 seconds of silence: sudo simply asks for your ordinary password.",
  },
];

const tested = [
  { name: "Arch", more: "Manjaro, EndeavourOS" },
  { name: "Debian 12 and 13", more: "Ubuntu 24.04, Mint, Pop!_OS" },
  { name: "Fedora", more: "RHEL, Rocky and Alma 9" },
  { name: "openSUSE Tumbleweed", more: "" },
];
const experimental: { name: string; note: ReactNode }[] = [
  { name: "Windows, via WSL", note: <>Pass <code className={CODE}>--phone</code>: discovery may not cross WSL2&apos;s NAT.</> },
  { name: "macOS 14+", note: <>Through <code className={CODE}>/etc/pam.d/sudo_local</code>.</> },
  { name: "FreeBSD", note: <>Through the <code className={CODE}>security/pam_rssh</code> port.</> },
];

function IconWell({ d }: { d: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
      <Glyph d={d} />
    </span>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-[var(--outline)] bg-[#07090D]">
      <div className="flex items-center justify-between border-b border-[var(--outline)] bg-[var(--surface-hi)] px-4 py-2">
        <span className="font-mono text-xs text-[var(--muted)]">{label}</span>
        <CopyButton
          text={code}
          label="Copy commands"
          className="min-h-8 rounded-lg border border-[#33405A] px-3 py-1 text-xs font-medium text-[var(--fg)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--accent)]"
        />
      </div>
      {/* Never wrapped: a command must read exactly as it is copied. */}
      <ol className="space-y-2.5 overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed [scrollbar-color:var(--outline)_transparent] [scrollbar-width:thin]">
        {code.split("\n").map((line) => (
          <li key={line} className="flex w-max gap-3 pr-4">
            <span aria-hidden="true" className="select-none text-[var(--accent)]">
              $
            </span>
            <span className="whitespace-pre text-[var(--fg)]">{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SudoStampLanding({ app }: { app: PublicApp }) {
  return (
    <>
      <AppHeader
        app={app}
        nav={[
          { href: "#how", label: "How it works" },
          { href: "#security", label: "Security" },
          { href: "#platforms", label: "Platforms" },
          { href: "#setup", label: "Set up" },
        ]}
        cta={{ href: app.playUrl ?? app.releasesUrl, label: app.playUrl ? "Get it on Google Play" : "Download", external: true }}
        ctaClass={`${PRIMARY} min-h-9 px-4 text-sm`}
      />

      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-48 -top-48 size-[52rem] rounded-full bg-[radial-gradient(closest-side,rgba(74,222,128,0.09),transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pb-28">
            <div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-2 font-medium text-[var(--accent)]">
                  <Fingerprint className="size-4" />
                  For Android 11+ and Linux
                </span>
                <span aria-hidden="true" className="text-[var(--faint)]">
                  ·
                </span>
                <span>Open source, MIT</span>
              </p>
              <h1 className="mt-5 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.025em] text-[var(--fg)] sm:text-[4rem]">
                Approve sudo with a <span className="text-[var(--accent)]">touch.</span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[var(--muted)]">
                Type <code className={CODE}>sudo</code>, your phone buzzes, you touch the fingerprint sensor and the command runs. No
                password typed, nothing in the cloud.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {app.playUrl ? (
                  <a href={app.playUrl} className={PRIMARY} {...ext(true)}>
                    Get it on Google Play
                  </a>
                ) : null}
                <a href={app.releasesUrl} className={app.playUrl ? GHOST : PRIMARY} {...ext(true)}>
                  Download the APK
                </a>
                <a href={app.repoUrl} className={GHOST} {...ext(true)}>
                  View the source
                </a>
              </div>
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-[var(--outline)] bg-[var(--surface)] py-1.5 pl-3.5 pr-1.5 text-sm">
                <span className="text-[var(--muted)]">Arch</span>
                <code className="font-mono text-[var(--fg)]">
                  <span className="text-[var(--accent)]">$</span> yay -S sudostamp
                </code>
                <CopyButton
                  text="yay -S sudostamp"
                  className="min-h-8 rounded-lg px-3 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hi)] hover:text-[var(--fg)]"
                />
              </div>
              <ul className="mt-9 grid max-w-lg grid-cols-1 gap-4 border-t border-[var(--outline)] pt-6 text-sm sm:grid-cols-3">
                {[
                  ["Hardware-enforced", "TEE or StrongBox"],
                  ["LAN-only", "no cloud, no account"],
                  ["Fail-closed", "else, your password"],
                ].map(([t, d]) => (
                  <li key={t}>
                    <p className="font-medium text-[var(--fg)]">{t}</p>
                    <p className="mt-0.5 text-[var(--muted)]">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
            <SudoStampDemo />
          </div>
        </section>

        {/* Numbers */}
        <section aria-label="At a glance" className="border-y border-[var(--outline)] bg-[var(--surface)]/60">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 px-5 sm:px-8 md:grid-cols-4">
            {[
              ["~110 KB", "release APK"],
              ["0", "third-party runtime dependencies"],
              ["1 key", "per computer, made in secure hardware"],
              ["60 s", "to approve, then the password prompt"],
            ].map(([v, l], i) => (
              <div
                key={l}
                className={`py-8 ${i % 2 ? "pl-6" : "pr-6"} md:px-8 md:first:pl-0 ${i ? "md:border-l md:border-[var(--outline)]" : ""}`}
              >
                <dt className="sr-only">{l}</dt>
                <dd>
                  <span className="block text-[2rem] font-semibold tracking-tight text-[var(--fg)]">{v}</span>
                  <span className="mt-1 block text-sm text-[var(--muted)]">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* What it looks like */}
        <section className={SECTION} aria-labelledby="looks">
          <div className="max-w-2xl">
            <p className={OVERLINE}>What it looks like</p>
            <h2 id="looks" className={H2}>
              Three steps. One touch.
            </h2>
          </div>
          <ol className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {shots.map((s) => (
              <li key={s.src} className="flex flex-col">
                <PhoneShot
                  src={`/apps/sudostamp/${s.src}.webp`}
                  alt={s.alt}
                  width={430}
                  height={860}
                  className="mx-auto w-full max-w-[16.5rem] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] [--frame-edge:#323B4E] [--frame:#1A1F29]"
                />
                <div className="mx-auto mt-7 flex w-full max-w-[16.5rem] gap-3.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--on-accent)]">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-medium text-[var(--fg)]">{s.title}</h3>
                    <p className="mt-1 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">{s.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl text-sm text-[var(--muted)]">
            Android&apos;s fingerprint sheet is a secure window, so it never appears in screenshots. Screenshots from a Pixel 7 emulator.
          </p>
          <ul className="mt-14 grid gap-4 md:grid-cols-3">
            {moreShots.map((s) => (
              <li key={s.src} className={`${CARD} flex items-start gap-5 p-5`}>
                <PhoneShot
                  src={`/apps/sudostamp/${s.src}.webp`}
                  alt={s.alt}
                  width={430}
                  height={860}
                  className="w-24 shrink-0 rounded-[1.1rem] p-[3px] [--frame-edge:#323B4E] [--frame:#1A1F29] [&>div]:rounded-[0.9rem]"
                />
                <div className="pt-1">
                  <h3 className="text-[17px] font-medium text-[var(--fg)]">{s.title}</h3>
                  <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-t border-[var(--outline)] bg-[var(--surface)]/40">
          <div className={`${SECTION} grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16`}>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className={OVERLINE}>How it works</p>
              <h2 className={H2}>
                <span className="block">Your phone becomes the key.</span>
                <span className="block text-[var(--muted)]">Your finger unlocks it.</span>
              </h2>
              <p className={LEAD}>
                The phone acts as an ssh-agent on your local network. The computer never sees your fingerprint, and the phone never
                sees your password.
              </p>
              {/* The exchange, at a glance */}
              <div className={`${CARD} mt-10 p-5`} aria-hidden="true">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <IconWell d={G.monitor} />
                    <div>
                      <p className="font-medium text-[var(--fg)]">Edith</p>
                      <p className="font-mono text-xs text-[var(--muted)]">pam_rssh</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    <div>
                      <p className="font-medium text-[var(--fg)]">Phone</p>
                      <p className="font-mono text-xs text-[var(--muted)]">Keystore</p>
                    </div>
                    <IconWell d={G.phone} />
                  </div>
                </div>
                <div className="mt-5 space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <span>32-byte challenge</span>
                    <span className="h-px flex-1 bg-[var(--outline)]" />
                    <Glyph d={G.arrowR} className="size-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Glyph d={G.arrowL} className="size-4 text-[var(--accent)]" />
                    <span className="h-px flex-1 bg-[var(--outline)]" />
                    <span>signature, after your finger</span>
                  </div>
                </div>
                <p className="mt-5 border-t border-[var(--outline)] pt-4 text-sm text-[var(--muted)]">
                  Same LAN only. No relay, no cloud, no account.
                </p>
              </div>
            </div>
            <ol>
              {flow.map((s, i) => {
                const last = i === flow.length - 1;
                return (
                  <li key={s.what} className="relative flex gap-5 pb-5 last:pb-0">
                    {!last ? (
                      <span aria-hidden="true" className="absolute bottom-0 left-[1.1rem] top-[3.6rem] w-px bg-[var(--outline)]" />
                    ) : null}
                    <span
                      className={`relative mt-4 flex size-[2.2rem] shrink-0 items-center justify-center rounded-full font-mono text-sm ${
                        last
                          ? "bg-[var(--accent)] text-[var(--on-accent)]"
                          : "border border-[var(--outline)] bg-[var(--bg)] text-[var(--accent)]"
                      }`}
                    >
                      {last ? <Glyph d={G.check} className="size-4" /> : i + 1}
                    </span>
                    <div className={`${CARD} flex-1 p-5 ${last ? "border-[var(--accent)]/40" : ""}`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{s.who}</p>
                      <h3 className="mt-1 text-lg font-medium text-[var(--fg)]">{s.what}</h3>
                      <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">{s.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-16 border-t border-[var(--outline)]">
          <div className={SECTION}>
            <div className="max-w-2xl">
              <p className={OVERLINE}>Security</p>
              <h2 className={H2}>Designed to sit in front of sudo.</h2>
              <p className={LEAD}>
                Every decision stays out of the app. The full threat model, including what it does not protect against, is in{" "}
                <a href={`${app.repoUrl}/-/blob/master/SECURITY.md`} className={LINK} {...ext(true)}>
                  SECURITY.md
                </a>
                .
              </p>
            </div>
            <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trust.map((t) => (
                <li key={t.title} className={`${CARD} p-6`}>
                  <IconWell d={t.icon} />
                  <h3 className="mt-5 text-[17px] font-medium leading-snug text-[var(--fg)]">{t.title}</h3>
                  <p className="mt-2 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">{t.body}</p>
                </li>
              ))}
            </ul>
            <div className={`${CARD} mt-4 grid gap-6 p-6 md:grid-cols-[1fr_1.25fr] md:gap-10`}>
              <div>
                <h3 className="text-[17px] font-medium text-[var(--fg)]">Signed and reproducible</h3>
                <p className="mt-2 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">
                  Every release APK is signed by the same key. Rebuild the tagged source, copy the published signature onto it, and you
                  get the same APK <span className="whitespace-nowrap">byte for byte</span> (verified for 1.4.0).
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Signing certificate SHA-256</p>
                  <CopyButton
                    text={CERT_SHA256}
                    className="min-h-8 rounded-lg border border-[#33405A] px-3 py-1 text-xs font-medium text-[var(--fg)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--accent)]"
                  />
                </div>
                <p className="mt-2 grid grid-cols-4 justify-items-center gap-x-3 gap-y-1 rounded-xl bg-[var(--bg)] px-4 py-3 font-mono text-[13px] leading-relaxed text-[var(--accent)] ring-1 ring-[var(--outline)]">
                  {CERT_SHA256.match(/.{8}/g)!.map((g, i) => (
                    <span key={i}>{g}</span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section id="platforms" className="scroll-mt-16 border-t border-[var(--outline)] bg-[var(--surface)]/40">
          <div className={`${SECTION} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
            <div>
              <p className={OVERLINE}>Platforms</p>
              <h2 className={H2}>Tested end to end on every push.</h2>
              <p className={LEAD}>
                Every push installs SudoStamp in a fresh container of each tested distribution and runs a real sudo against a mock
                phone. The installer brings pam_rssh with it: a package where one exists, otherwise built from a pinned, verified
                commit.
              </p>
              <ul className="mt-8 space-y-3 text-[15px]">
                {[
                  "No password while the phone approves",
                  "The password prompt when it denies",
                  "The PAM file restored byte for byte by rollback",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[var(--fg)]">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Glyph d={G.check} className="size-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
                  <span className="size-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                  Tested in CI
                </h3>
                <ul className={`${CARD} divide-y divide-[var(--outline)]`}>
                  {tested.map((t) => (
                    <li key={t.name} className="flex items-center gap-3.5 px-5 py-4">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Glyph d={G.check} className="size-3.5" />
                      </span>
                      <span className="text-[var(--fg)]">
                        {t.name}
                        {t.more ? <span className="text-[var(--muted)]">, {t.more}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
                  <span className="size-2 rounded-full bg-[var(--warn)]" aria-hidden="true" />
                  Experimental, not yet tested
                </h3>
                <ul className={`${CARD} divide-y divide-[var(--outline)]`}>
                  {experimental.map((t) => (
                    <li key={t.name} className="px-5 py-4">
                      <p className="text-[var(--fg)]">{t.name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className="scroll-mt-16 border-t border-[var(--outline)]">
          <div className={SECTION}>
            <div className="max-w-2xl">
              <p className={OVERLINE}>Set up</p>
              <h2 className={H2}>Set it up once. Then just touch.</h2>
            </div>
            <div className="mt-12 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className={`${CARD} flex flex-col p-6 sm:p-7`}>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full border border-[var(--accent)]/50 font-mono text-sm text-[var(--accent)]">
                    1
                  </span>
                  <h3 className="text-xl font-medium text-[var(--fg)]">On the phone</h3>
                </div>
                <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">
                  Install it from Google Play or as an APK, open it and tap <span className="text-[var(--fg)]">Get started</span>. The phone waits for your
                  computer, and makes a key for it inside its secure hardware when you pair.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {app.playUrl ? (
                    <a href={app.playUrl} className={PRIMARY} {...ext(true)}>
                      Get it on Google Play
                    </a>
                  ) : null}
                  <a href={app.releasesUrl} className={app.playUrl ? GHOST : PRIMARY} {...ext(true)}>
                    Download the APK
                  </a>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                  Or let Obtainium install it and keep it updated: add{" "}
                  <span className="font-mono text-[var(--fg)] [overflow-wrap:anywhere]">{app.repoUrl.replace("https://", "")}</span>.
                </p>
                <div className="mt-8 border-t border-[var(--outline)] pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">You need</p>
                  <ul className="mt-3 space-y-2 text-[15px] text-[var(--fg)]">
                    {[
                      "Android 11 or later",
                      "A strong (Class 3) fingerprint sensor",
                      "The same network as your computer",
                      "A stable address for the phone (a DHCP reservation)",
                    ].map((r) => (
                      <li key={r} className="flex gap-3">
                        <Glyph d={G.check} className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className={`${CARD} min-w-0 p-6 sm:p-7`}>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full border border-[var(--accent)]/50 font-mono text-sm text-[var(--accent)]">
                    2
                  </span>
                  <h3 className="text-xl font-medium text-[var(--fg)]">On the computer</h3>
                </div>
                <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[var(--muted)]">
                  No clone needed. Download the installer and its signature, check the signature, and only then run it. The app shows
                  the same lines, with a Copy button.
                </p>
                <div className="mt-5">
                  <CodeBlock code={SETUP} label="Linux" />
                </div>
                <p className="mt-5 text-[15px] text-[var(--muted)]">
                  On Arch: <code className={CODE}>yay -S sudostamp</code>, then <code className={CODE}>sudo sudostamp setup</code>.
                  Updates come with your system.
                </p>
                <p className="mt-4 border-t border-[var(--outline)] pt-4 text-sm leading-relaxed text-[var(--muted)]">
                  <span className="text-[var(--fg)]">Why the signature?</span> Files on a release page can be replaced after publishing,
                  and this one runs as root. The signing key never touches CI.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter app={app} />
    </>
  );
}
