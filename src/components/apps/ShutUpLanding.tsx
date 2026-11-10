import type { ReactNode } from "react";
import type { PublicApp } from "@/lib/apps";
import PhoneShot from "./PhoneShot";
import ShutUpWave from "./ShutUpWave";
import { AppHeader, AppFooter, ext } from "./AppChrome";

// ShutUp!'s page, in ShutUp!'s own design language: Material 3 from the
// app's tonal palette (ui/theme/Color.kt), pill buttons, 28dp cards, tonal
// containers instead of borders. Every claim is from the repository's README,
// SECURITY.md or Play listing.

const BTN = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-[background-color,box-shadow,transform] active:scale-[0.98]";
const FILLED = `${BTN} bg-[var(--accent)] text-[var(--on-accent)] hover:shadow-[0_6px_18px_-6px_rgba(48,98,140,0.7)]`;
const TONAL = `${BTN} bg-[var(--secondary-soft)] text-[var(--on-secondary-soft)] hover:bg-[#C8D8EC]`;
const EYEBROW = "text-sm font-medium text-[var(--accent)]";
const H2 = "mt-2 text-[2rem] font-medium leading-tight tracking-tight text-balance text-[var(--fg)] sm:text-[2.6rem]";
const LEAD = "mt-4 max-w-2xl text-lg leading-relaxed text-[var(--muted)]";
const SECTION = "mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28";

function Icon({ d, className = "size-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}

// Material Symbols-style glyphs, drawn for this page.
const I = {
  play: "M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4A.8.8 0 0 0 8 5.6z",
  code: "M8.7 16.3 4.4 12l4.3-4.3-1.4-1.4L1.6 12l5.7 5.7zm6.6 0 4.3-4.3-4.3-4.3 1.4-1.4 5.7 5.7-5.7 5.7z",
  wave: "M3 9.5c1.6-2.1 3.2-2.1 4.8 0s3.2 2.1 4.8 0 3.2-2.1 4.8 0 2.4 1.6 3.6 1.6v2c-1.9 0-3.2-.9-4.4-2.5-1-1.3-1.7-1.3-2.7 0-2.4 3.1-5.2 3.1-7.6 0-1-1.3-1.7-1.3-2.7 0zm0 6c1.6-2.1 3.2-2.1 4.8 0s3.2 2.1 4.8 0 3.2-2.1 4.8 0 2.4 1.6 3.6 1.6v2c-1.9 0-3.2-.9-4.4-2.5-1-1.3-1.7-1.3-2.7 0-2.4 3.1-5.2 3.1-7.6 0-1-1.3-1.7-1.3-2.7 0z",
  call: "M20 15.5c-1.2 0-2.4-.2-3.6-.6a1 1 0 0 0-1 .3l-2.2 2.2a15 15 0 0 1-6.6-6.6l2.2-2.2a1 1 0 0 0 .3-1A11 11 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1 17 17 0 0 0 17 17 1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z",
  shield: "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm-1.2 14.2L7 12.4l1.4-1.4 2.4 2.4 4.8-4.8 1.4 1.4z",
  lock: "M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0z",
  sensor: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5C6.5 2 2 6.5 2 12h2a8 8 0 0 1 16 0h2c0-5.5-4.5-10-10-10z",
  undo: "M12.5 8c-2.6 0-5 1-6.9 2.6L2 7v9h9l-3.6-3.6A8 8 0 0 1 20.1 16l2.4-.8A10.5 10.5 0 0 0 12.5 8z",
  translate: "m12.9 15.1-2.5-2.5v-.1A17 17 0 0 0 14 6h3V4h-7V2H8v2H1v2h11.2A15.7 15.7 0 0 1 9 11.4 15.7 15.7 0 0 1 6.7 8h-2a17.6 17.6 0 0 0 2.9 4.5l-5.1 5 1.4 1.5 5-5 3.1 3.1zM18.5 10h-2L12 22h2l1.1-3h4.8l1.1 3h2zm-2.6 7 1.6-4.3 1.6 4.3z",
};

const gestures: { title: string; tone: string; icon: string; items: { g: string; a: ReactNode }[] }[] = [
  {
    title: "While the phone rings",
    tone: "bg-[var(--accent-soft)] text-[var(--on-accent-soft)]",
    icon: I.wave,
    items: [
      { g: "Single wave", a: "Silence. It can only silence, so reaching to decline never answers." },
      { g: "Double wave", a: "Answer or end the call." },
      { g: "Pick it up", a: "From a flat surface: silence." },
    ],
  },
  {
    title: "During a call",
    tone: "bg-[var(--secondary-soft)] text-[var(--on-secondary-soft)]",
    icon: I.call,
    items: [
      { g: "Face down", a: "On a table: end the call, or mute the mic until you lift it." },
      { g: "Fold it shut", a: "On a foldable: end the call." },
    ],
  },
  {
    title: "Any time",
    tone: "bg-[var(--tertiary-soft)] text-[var(--on-tertiary-soft)]",
    icon: I.clock,
    items: [
      { g: "Scheduled calls", a: "It buzzes, says the name out loud and dials on the minute. Repeatable, cancellable, on the SIM you pick." },
      { g: "Gesture playground", a: "Rehearse every gesture live and tune the double-wave window to your pace." },
      { g: "Tile and widget", a: "A Quick Settings tile and a home-screen widget for the master switch and your next call." },
    ],
  },
];

const screens = [
  { src: "ringing", title: "Ringing", body: "Listening for a wave", alt: "An incoming call with ShutUp! showing Ringing, listening for a wave, and the single and double wave settings" },
  { src: "schedules", title: "Schedules", body: "Calls it will place for you", alt: "Schedules: calls to Dad today and Amy tomorrow, repeating every 24 hours" },
  { src: "editor", title: "Schedule a call", body: "Quick chips for the usual times", alt: "Schedule a call: pick a contact, a phone number, and when, with quick chips such as In 15 min and Tonight 8 PM" },
  { src: "settings", title: "Settings", body: "Double-wave window, haptics, theme", alt: "Settings: Try your gestures, a double-wave window of 1.2 seconds, haptics, a Quick Settings tile and theme" },
];

const trust = [
  { icon: I.lock, title: "Nothing leaves the phone", body: "No analytics, no crash reporters, no ads. No feature uses the network." },
  { icon: I.shield, title: "No contacts or call-log access", body: "The system picker hands over the one number you choose, and nothing else." },
  { icon: I.sensor, title: "Sensors only during calls", body: "Between calls the service listens to call state and nothing else." },
  { icon: I.undo, title: "Everything is reversible", body: "Ringer mode and mic mute are restored when the call ends, and the notification's Turn off button stops the service." },
];

const languages = ["English", "Deutsch", "العربية", "Français", "Español", "Русский", "日本語", "简体中文", "हिन्दी", "Português (Brasil)"];

export default function ShutUpLanding({ app }: { app: PublicApp }) {
  const play = app.playUrl!;
  return (
    <>
      <AppHeader
        app={app}
        nav={[
          { href: "#gestures", label: "Gestures" },
          { href: "#screens", label: "Screens" },
          { href: "#privacy", label: "Privacy" },
          { href: "#story", label: "Story" },
        ]}
        cta={{ href: play, label: "Get it on Google Play", external: true }}
        ctaClass={`${FILLED} min-h-10 px-5 text-sm`}
      />

      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1fr_1fr] lg:gap-8 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3.5 py-1.5 text-sm text-[var(--muted)]">
              <span className="size-2 rounded-full bg-[var(--brand)]" aria-hidden="true" />
              Free on Google Play · Android 9+
            </p>
            <h1 className="mt-6 text-[2.75rem] font-medium leading-[1.04] tracking-[-0.02em] text-[var(--fg)] sm:text-[4rem]">
              Control calls without touching the screen.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
              Wave over the phone to silence it. Wave twice to answer or end. Put it face down to hang up. And let it place a call for
              you at a set time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={play} className={FILLED} {...ext(true)}>
                <Icon d={I.play} className="size-5" />
                Get it on Google Play
              </a>
              <a href={app.repoUrl} className={TONAL} {...ext(true)}>
                <Icon d={I.code} className="size-5" />
                Source on GitLab
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-[var(--muted)]">
              {["No ads", "No tracking", "Open source (GPLv3)"].map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] text-[var(--accent)]">
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <ShutUpWave />
        </section>

        {/* Numbers */}
        <section aria-label="At a glance" className="mx-auto max-w-6xl px-5 sm:px-8">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["0", "trackers or network requests"],
              ["10", "languages"],
              ["~4.4 MB", "release APK"],
              ["Android 9+", "phones, tablets and foldables"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-[var(--r-card)] bg-[var(--surface)] px-6 py-6">
                <dt className="sr-only">{l}</dt>
                <dd>
                  <span className="block text-[2rem] font-medium tracking-tight text-[var(--accent)]">{v}</span>
                  <span className="mt-0.5 block text-sm text-[var(--muted)]">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Gestures */}
        <section id="gestures" className={`${SECTION} scroll-mt-20`}>
          <p className={EYEBROW}>Gestures</p>
          <h2 className={H2}>Your hands are busy. Your phone understands.</h2>
          <p className={LEAD}>
            A small foreground service watches call state. When a call rings or connects it turns on the proximity, accelerometer and
            (on foldables) hinge sensors, and releases them when the call ends.
          </p>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {gestures.map((c) => (
              <article key={c.title} className="flex flex-col rounded-[var(--r-card)] bg-[var(--surface-low)] p-2">
                <header className={`flex items-center gap-3 rounded-[22px] px-5 py-4 ${c.tone}`}>
                  <Icon d={c.icon} />
                  <h3 className="text-lg font-medium">{c.title}</h3>
                </header>
                <dl className="space-y-5 px-5 pb-5 pt-6">
                  {c.items.map((i) => (
                    <div key={i.g}>
                      <dt className="font-medium text-[var(--fg)]">{i.g}</dt>
                      <dd className="mt-1 text-[15px] leading-relaxed text-[var(--muted)]">{i.a}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* Screens */}
        <section id="screens" className="scroll-mt-20 bg-[var(--surface-low)]">
          <div className={SECTION}>
            <p className={EYEBROW}>Screens</p>
            <h2 className={H2}>Material 3 Expressive, with dynamic colour.</h2>
            <p className={LEAD}>
              Light and dark themes, predictive back and adaptive layouts for tablets and foldables.
            </p>
          </div>
          <ul className="-mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-20 [scrollbar-width:thin] sm:px-8 lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:pb-28">
            {screens.map((s) => (
              <li key={s.src} className="w-[64vw] max-w-[16rem] shrink-0 snap-center lg:w-auto lg:max-w-none">
                <PhoneShot
                  src={`/apps/shutup/${s.src}.webp`}
                  alt={s.alt}
                  width={540}
                  height={1080}
                  className="rounded-[2.2rem] p-[6px] shadow-[0_30px_50px_-30px_rgba(16,74,115,0.45)] [--frame-edge:var(--outline)] [--frame:#FFFFFF] [&>div]:rounded-[1.8rem]"
                />
                <p className="mt-5 text-center text-[17px] font-medium text-[var(--fg)]">{s.title}</p>
                <p className="mt-0.5 text-center text-[15px] text-[var(--muted)]">{s.body}</p>
              </li>
            ))}
          </ul>
          <p className="-mt-14 pb-16 text-center text-sm text-[var(--muted)] lg:hidden">Swipe for more screens</p>
        </section>

        {/* Privacy */}
        <section id="privacy" className={`${SECTION} scroll-mt-20`}>
          <div className="overflow-hidden rounded-[40px] bg-[var(--inverse)] px-6 py-12 text-[var(--on-inverse)] sm:px-12 sm:py-16">
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-medium text-[var(--inverse-primary)]">Privacy</p>
                <h2 className="mt-2 text-[2rem] font-medium leading-tight tracking-tight sm:text-[2.6rem]">Your calls stay yours.</h2>
                <p className="mt-4 text-lg leading-relaxed text-[var(--on-inverse)]/75">
                  ShutUp! makes no network requests at all. Your settings and scheduled calls stay in the app&apos;s private storage.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={`/apps/${app.slug}/privacy-policy/`}
                    className={`${BTN} bg-[var(--inverse-primary)] text-[#003354] hover:bg-[#B5D8FC]`}
                  >
                    Read the privacy policy
                  </a>
                  <a
                    href={`${app.repoUrl}/-/blob/master/SECURITY.md`}
                    className={`${BTN} border border-[var(--on-inverse)]/25 text-[var(--on-inverse)] hover:bg-white/10`}
                    {...ext(true)}
                  >
                    Security notes
                  </a>
                </div>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {trust.map((t) => (
                  <li key={t.title} className="rounded-[24px] bg-white/[0.06] p-5">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[var(--inverse-primary)]/15 text-[var(--inverse-primary)]">
                      <Icon d={t.icon} className="size-5" />
                    </span>
                    <h3 className="mt-4 font-medium">{t.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--on-inverse)]/70">{t.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Story */}
        <section id="story" className="scroll-mt-20">
          <div className={`${SECTION} grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]`}>
            <div>
              <p className={EYEBROW}>Since 2016</p>
              <h2 className={H2}>A college project that 27,000 people installed.</h2>
              <p className={LEAD}>
                ShutUp! began as a college project in 2016 and reached 27,000 installs at 4.7★ on Google Play. In 2026 it was rebuilt
                from scratch for modern Android, keeping the idea and the blue.
              </p>
              <dl className="mt-8 grid max-w-sm grid-cols-2 gap-3">
                {[
                  ["27,000", "installs"],
                  ["4.7★", "on Google Play"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-[24px] bg-[var(--accent-soft)] px-5 py-4">
                    <dt className="sr-only">{l}</dt>
                    <dd>
                      <span className="block text-[2rem] font-medium tracking-tight text-[var(--on-accent-soft)]">{v}</span>
                      <span className="text-sm text-[var(--on-accent-soft)]/80">{l}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <a href={`${app.repoUrl}/-/tree/v1.5.7-legacy`} className="mt-6 inline-block text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]" {...ext(true)}>
                Browse the original source
              </a>
            </div>
            <figure className="rounded-[var(--r-card)] bg-[var(--surface)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/apps/shutup/v1-2017.webp"
                alt="Eight screens of ShutUp! version 1 from 2017: the master switch, the gesture automation settings, scheduling a call to Amy and the launcher shortcuts"
                width={1600}
                height={1440}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full rounded-[20px]"
              />
              <figcaption className="px-2 pb-1 pt-3 text-sm text-[var(--muted)]">Version 1, 2017.</figcaption>
            </figure>
          </div>
        </section>

        {/* Good to know */}
        <section className="bg-[var(--surface-low)]">
          <div className={`${SECTION} grid gap-10 lg:grid-cols-[0.85fr_1.15fr]`}>
            <div>
              <p className={EYEBROW}>Good to know</p>
              <h2 className={H2}>Honest limits.</h2>
              <p className={LEAD}>What Android allows a gesture app to do has changed since 2016. Here is where it stands.</p>
              <a href={app.issuesUrl} className="mt-6 inline-block text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]" {...ext(true)}>
                Something else? Open an issue
              </a>
            </div>
            <dl className="divide-y divide-[var(--outline)] rounded-[var(--r-card)] bg-[var(--surface-lowest)] px-6">
              {[
                {
                  q: "Can it switch the speaker on when I lower the phone?",
                  a: "Not any more. Since Android 12 the in-call audio route belongs to the phone app, so no third-party app can switch it.",
                },
                {
                  q: "My wave isn't detected.",
                  a: "Proximity sensors vary: some phones only expose a virtual or touch-based sensor that ignores a hand above the screen. Turn on Light assist to also count a quick shadow over the light sensor. The gesture playground shows which sensor your phone uses and what it reports.",
                },
                {
                  q: "Which permissions does it ask for?",
                  a: "Phone (call state, answer and end, place calls) and Notifications. Optionally Do Not Disturb access, for true silence instead of vibrate, and Alarms & reminders, for scheduled calls on the minute.",
                },
              ].map((f) => (
                <div key={f.q} className="py-6">
                  <dt className="text-lg font-medium text-[var(--fg)]">{f.q}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Get it */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="flex flex-col items-start gap-8 rounded-[40px] bg-[var(--accent-soft)] px-6 py-12 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[2rem] font-medium leading-tight tracking-tight text-[var(--on-accent-soft)] sm:text-[2.4rem]">
                Free. No ads. No account.
              </h2>
              <p className="mt-3 max-w-xl text-[var(--on-accent-soft)]/80">
                On Google Play, or as a signed APK with checksums from GitLab Releases.
              </p>
              <ul className="mt-6 flex max-w-xl flex-wrap items-center gap-1.5 text-sm text-[var(--on-accent-soft)]" aria-label="Languages">
                <li aria-hidden="true" className="mr-1">
                  <Icon d={I.translate} className="size-5" />
                </li>
                {languages.map((l) => (
                  <li key={l} className="rounded-full bg-white/60 px-2.5 py-1">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <a href={play} className={FILLED} {...ext(true)}>
                <Icon d={I.play} className="size-5" />
                Get it on Google Play
              </a>
              <a href={app.releasesUrl} className={`${BTN} bg-[var(--surface-lowest)] text-[var(--accent)] hover:bg-white/70`} {...ext(true)}>
                GitLab Releases
              </a>
            </div>
          </div>
        </section>
      </main>

      <AppFooter app={app} />
    </>
  );
}
