// ShutUp!'s hero: the ringing phone (a real screenshot) with the app's own
// hand-with-watch artwork waving over the proximity sensor, after which the
// ringing stops and the chip says so. CSS keyframes only, one 9 s loop. Each
// element's static style is its END state (silenced), so reduced motion
// shows the outcome without the movement.

const CSS = `
.suw{--t:9s}
.suw-a{animation-duration:var(--t);animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.45,0,.25,1)}
.suw-hand{animation-name:suw-hand;opacity:0;transform:translate(70%,-6%) rotate(14deg)}
@keyframes suw-hand{
  0%,20%{opacity:0;transform:translate(70%,-6%) rotate(14deg)}
  24%{opacity:1;transform:translate(45%,-8%) rotate(10deg)}
  36%{opacity:1;transform:translate(-38%,-10%) rotate(-10deg)}
  41%{opacity:0;transform:translate(-62%,-6%) rotate(-14deg)}
  100%{opacity:0;transform:translate(-62%,-6%) rotate(-14deg)}}
.suw-pulse{animation-name:suw-pulse;opacity:0}
@keyframes suw-pulse{0%{opacity:0;transform:scale(.92)}6%{opacity:.55}16%{opacity:0;transform:scale(1.12)}17%{transform:scale(.92)}22%{opacity:.55}32%{opacity:0;transform:scale(1.12)}100%{opacity:0}}
.suw-ring{animation-name:suw-ring;opacity:0}
@keyframes suw-ring{0%,34%{opacity:1}38%,100%{opacity:0}}
.suw-arcs{animation-name:suw-arcs;opacity:0}
@keyframes suw-arcs{0%,24%{opacity:0}28%,34%{opacity:1}38%,100%{opacity:0}}
.suw-quiet{animation-name:suw-quiet}
@keyframes suw-quiet{0%,36%{opacity:0;transform:translateY(6px) scale(.96)}40%,100%{opacity:1;transform:none}}
.suw-shake{animation-name:suw-shake}
@keyframes suw-shake{0%,2%,6%,10%,14%,18%,22%,26%,30%,34%{transform:rotate(0)}
  1%,9%,17%,25%,33%{transform:rotate(-1.3deg)}5%,13%,21%,29%{transform:rotate(1.3deg)}35%,100%{transform:rotate(0)}}
@media (prefers-reduced-motion: reduce){.suw-a{animation:none!important}.suw-ring,.suw-pulse,.suw-hand,.suw-arcs{display:none}}
`;

function Bell({ off = false }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path
        d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22zm6.5-6V11a6.5 6.5 0 0 0-5-6.3V4a1.5 1.5 0 0 0-3 0v.7A6.5 6.5 0 0 0 5.5 11v5L4 17.6v.9h16v-.9z"
        fill="currentColor"
      />
      {off ? <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /> : null}
    </svg>
  );
}

export default function ShutUpWave() {
  return (
    <div
      role="img"
      aria-label="Animation: a phone rings; a hand waves once above it without touching the screen; the ringing stops and the app shows Silenced."
      className="suw relative mx-auto aspect-[5/6] w-full max-w-[30rem]"
    >
      <style>{CSS}</style>
      {/* Tonal stage, the app's primaryContainer */}
      <div className="absolute inset-[4%_0_0_0] rounded-[48px] bg-[var(--accent-soft)]" />
      <div
        aria-hidden="true"
        className="absolute inset-[4%_0_0_0] overflow-hidden rounded-[48px] bg-[radial-gradient(60%_50%_at_50%_30%,rgba(255,255,255,0.75),transparent)]"
      />

      {/* Side phones */}
      <div className="absolute left-[4%] top-[30%] hidden w-[30%] -rotate-[7deg] sm:block">
        <div className="rounded-[1.6rem] bg-[#E6E8EE] p-[5px] ring-1 ring-[var(--outline)] shadow-[0_20px_40px_-20px_rgba(16,74,115,0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apps/shutup/settings.webp" alt="" width={540} height={1080} loading="lazy" decoding="async" className="block w-full rounded-[1.3rem]" />
        </div>
      </div>
      <div className="absolute right-[4%] top-[33%] hidden w-[30%] rotate-[7deg] sm:block">
        <div className="rounded-[1.6rem] bg-[#E6E8EE] p-[5px] ring-1 ring-[var(--outline)] shadow-[0_20px_40px_-20px_rgba(16,74,115,0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apps/shutup/schedules.webp" alt="" width={540} height={1080} loading="lazy" decoding="async" className="block w-full rounded-[1.3rem]" />
        </div>
      </div>

      {/* Main phone */}
      <div className="absolute left-1/2 top-[13%] w-[58%] -translate-x-1/2 sm:w-[44%]">
        <div className="suw-a suw-shake origin-bottom">
          <span className="suw-a suw-pulse absolute -inset-3 rounded-[2.4rem] border-2 border-[var(--accent)]" />
          <div className="relative rounded-[2rem] bg-[#F1F3F9] p-[6px] ring-1 ring-[var(--outline)] shadow-[0_40px_70px_-30px_rgba(16,74,115,0.6)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/apps/shutup/ringing.webp"
              alt=""
              width={540}
              height={1080}
              decoding="async"
              fetchPriority="high"
              className="block w-full rounded-[1.65rem]"
            />
          </div>
        </div>
      </div>

      {/* The hand, over the top of the phone where the proximity sensor is */}
      <div className="pointer-events-none absolute left-[42%] top-[-3%] w-[16%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/apps/shutup/hand.webp" alt="" width={400} height={600} decoding="async" className="suw-a suw-hand block w-full drop-shadow-[0_18px_22px_rgba(16,74,115,0.35)]" />
      </div>

      {/* Status chip */}
      <div className="absolute bottom-[5%] left-1/2 w-max -translate-x-1/2">
        <div className="grid whitespace-nowrap [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:justify-self-center">
          <div className="suw-a suw-ring flex items-center gap-2 rounded-2xl bg-[var(--surface-lowest)] px-4 py-2.5 text-sm font-medium text-[var(--fg)] shadow-[0_8px_24px_-8px_rgba(16,74,115,0.35)]">
            <span className="text-[var(--accent)]">
              <Bell />
            </span>
            Incoming call
          </div>
          <div className="suw-a suw-quiet flex items-center gap-2 rounded-2xl bg-[var(--inverse)] px-4 py-2.5 text-sm font-medium text-[var(--on-inverse)] shadow-[0_8px_24px_-8px_rgba(16,74,115,0.45)]">
            <span className="text-[var(--inverse-primary)]">
              <Bell off />
            </span>
            Silenced with one wave
          </div>
        </div>
      </div>
    </div>
  );
}
