// The hero demo: a terminal asks for sudo, the phone shows the request, the
// fingerprint is touched, the phone says Approved and the command runs. CSS
// keyframes only (no JavaScript, no video), one 11 s loop shared by every
// element. Each element's static style is its END state, and the keyframes
// supply the hidden phases, so with reduced motion (or no animation support)
// the demo simply shows the finished story.
//
// The mark is the app's own (res/drawable/ic_logo.xml: Material Symbols
// "fingerprint", Rounded, Apache-2.0).

const FP_PATH = "M481,179Q587,179 681,224.5Q775,270 838,356Q845,365 842.5,372Q840,379 834,384Q828,389 820,388.5Q812,388 806,380Q751,302 664.5,260.5Q578,219 481,219Q384,219 299,260.5Q214,302 158,380Q152,389 144,390Q136,391 130,386Q123,381 121.5,373.5Q120,366 126,358Q188,273 281.5,226Q375,179 481,179ZM481,273Q616,273 713,363Q810,453 810,586Q810,636 774.5,669.5Q739,703 688,703Q637,703 600.5,669.5Q564,636 564,586Q564,553 539.5,530.5Q515,508 481,508Q447,508 422.5,530.5Q398,553 398,586Q398,683 455.5,748Q513,813 604,839Q613,842 616,849Q619,856 617,864Q615,871 609,876Q603,881 594,879Q490,853 424,775.5Q358,698 358,586Q358,536 394,502Q430,468 481,468Q532,468 568,502Q604,536 604,586Q604,619 629,641.5Q654,664 688,664Q722,664 746,641.5Q770,619 770,586Q770,470 685,391Q600,312 482,312Q364,312 279,391Q194,470 194,585Q194,609 198.5,645Q203,681 220,729Q223,738 219.5,745Q216,752 208,755Q200,758 192.5,754.5Q185,751 182,743Q167,704 160.5,665.5Q154,627 154,586Q154,453 250.5,363Q347,273 481,273ZM481,81Q545,81 606,96.5Q667,112 724,141Q733,146 734.5,153Q736,160 733,167Q730,174 723,178Q716,182 706,177Q653,150 596.5,135.5Q540,121 481,121Q423,121 367,134.5Q311,148 260,177Q252,182 244,179.5Q236,177 232,169Q228,161 230,154.5Q232,148 240,143Q296,113 357,97Q418,81 481,81ZM481,370Q574,370 641,432.5Q708,495 708,586Q708,595 702.5,600.5Q697,606 688,606Q680,606 674,600.5Q668,595 668,586Q668,511 612.5,460.5Q557,410 481,410Q405,410 350.5,460.5Q296,511 296,586Q296,667 324,723.5Q352,780 406,837Q412,843 412,851Q412,859 406,865Q400,871 392,871Q384,871 378,865Q319,803 287.5,738.5Q256,674 256,586Q256,495 322,432.5Q388,370 481,370ZM480,566Q489,566 494.5,572Q500,578 500,586Q500,661 554,709Q608,757 680,757Q686,757 697,756Q708,755 720,753Q729,751 735.5,755.5Q742,760 744,769Q746,777 741,783Q736,789 728,791Q710,796 696.5,796.5Q683,797 680,797Q591,797 525.5,737Q460,677 460,586Q460,578 465.5,572Q471,566 480,566Z";

const CSS = `
.ssd *{box-sizing:border-box}
.ssd{--t:11s}
.ssd-anim{animation-duration:var(--t);animation-iteration-count:infinite;animation-timing-function:linear}
.ssd-type{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom;width:16ch;animation-name:ssd-type;animation-timing-function:steps(16,end)}
@keyframes ssd-type{0%,3%{width:0}17%,100%{width:16ch}}
.ssd-l2{animation-name:ssd-l2}
@keyframes ssd-l2{0%,19%{opacity:0}21%,100%{opacity:1}}
.ssd-l3{animation-name:ssd-l3}
@keyframes ssd-l3{0%,63%{opacity:0;transform:translateY(4px)}66%,100%{opacity:1;transform:none}}
.ssd-l4{animation-name:ssd-l4}
@keyframes ssd-l4{0%,69%{opacity:0;transform:translateY(4px)}72%,100%{opacity:1;transform:none}}
.ssd-l5{animation-name:ssd-l5}
@keyframes ssd-l5{0%,75%{opacity:0}77%,100%{opacity:1}}
.ssd-cursor{animation:ssd-blink 1.1s steps(1) infinite}
@keyframes ssd-blink{50%{opacity:0}}
.ssd-wait{animation-name:ssd-wait}
@keyframes ssd-wait{0%,20%{opacity:0}22%,58%{opacity:1}60%,100%{opacity:0}}

.ssd-idle{animation-name:ssd-idle;opacity:0}
@keyframes ssd-idle{0%,35%{opacity:1}37%,100%{opacity:0}}
.ssd-notif{animation-name:ssd-notif;opacity:0}
@keyframes ssd-notif{0%,22%{opacity:0;transform:translateY(10px) scale(.97)}25%,34%{opacity:1;transform:none}36%,100%{opacity:0;transform:scale(.97)}}
.ssd-tap{animation-name:ssd-tap;opacity:0}
@keyframes ssd-tap{0%,31%{opacity:0;transform:scale(.4)}32.5%{opacity:.9;transform:scale(1)}35%,100%{opacity:0;transform:scale(1.6)}}
.ssd-ask{animation-name:ssd-ask;opacity:0}
@keyframes ssd-ask{0%,35%{opacity:0;transform:scale(.98)}37%,57%{opacity:1;transform:none}59%,100%{opacity:0}}
.ssd-ring{animation-name:ssd-ring;stroke-dashoffset:0}
@keyframes ssd-ring{0%,36%{stroke-dashoffset:0}57%,100%{stroke-dashoffset:60}}
.ssd-touch{animation-name:ssd-touch;opacity:0}
@keyframes ssd-touch{0%,49%{opacity:0;transform:scale(.6)}51%{opacity:1;transform:scale(1)}56%,100%{opacity:0;transform:scale(1.35)}}
.ssd-ok{animation-name:ssd-ok}
@keyframes ssd-ok{0%,58%{opacity:0;transform:scale(.96)}61%,100%{opacity:1;transform:none}}
.ssd-check{stroke-dasharray:30;stroke-dashoffset:0;animation-name:ssd-check}
@keyframes ssd-check{0%,60%{stroke-dashoffset:30}66%,100%{stroke-dashoffset:0}}
.ssd-fade{animation-name:ssd-fade}
@keyframes ssd-fade{0%,1%{opacity:0}4%,94%{opacity:1}100%{opacity:0}}

@media (prefers-reduced-motion: reduce){
  .ssd-anim,.ssd-cursor{animation:none!important}
  .ssd-wait,.ssd-idle,.ssd-notif,.ssd-ask,.ssd-touch,.ssd-tap{display:none}
}
`;

function Fingerprint({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 960 960" aria-hidden="true" className={className}>
      <path d={FP_PATH} fill="currentColor" />
    </svg>
  );
}

export { Fingerprint };

export default function SudoStampDemo() {
  return (
    <div
      role="img"
      aria-label="Animation: a terminal runs sudo pacman -Syu and waits; the phone shows Approve sudo? from Edith; a finger touches the sensor; the phone says Approved and the update runs, with no password typed."
      className="ssd relative mx-auto w-full max-w-[40rem] select-none"
    >
      <style>{CSS}</style>
      <div className="ssd-anim ssd-fade relative flex flex-col items-center gap-8 sm:flex-row sm:gap-[5%]">
        {/* Terminal */}
        <div className="relative w-full overflow-hidden rounded-[14px] sm:w-[57%] border border-[var(--outline)] bg-[#07090D] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--outline)] bg-[var(--surface)] px-3.5 py-2.5">
            <span className="size-2.5 rounded-full bg-[#F87171]/80" />
            <span className="size-2.5 rounded-full bg-[#FBBF24]/80" />
            <span className="size-2.5 rounded-full bg-[#4ADE80]/80" />
            <span className="ml-2 font-mono text-[11px] text-[var(--muted)]">you@edith: ~</span>
          </div>
          <div className="space-y-1.5 p-4 font-mono text-[12.5px] leading-relaxed">
            <div className="whitespace-nowrap text-[var(--fg)]">
              <span className="text-[var(--accent)]">$ </span>
              <span className="ssd-anim ssd-type">sudo pacman -Syu</span>
            </div>
            <div className="ssd-anim ssd-l2 text-[var(--muted)]">
              SudoStamp: approve on your phone (up to 60s)
              <span className="ssd-anim ssd-wait ml-1 text-[var(--accent)]">…</span>
            </div>
            <div className="ssd-anim ssd-l3 text-[var(--fg)]">:: Synchronizing package databases...</div>
            <div className="ssd-anim ssd-l4 text-[var(--muted)]">&nbsp;core is up to date</div>
            <div className="ssd-anim ssd-l5 text-[var(--fg)]">
              <span className="text-[var(--accent)]">$ </span>
              <span className="ssd-cursor inline-block h-[1.05em] w-[0.55em] translate-y-[0.15em] bg-[var(--fg)]/80" />
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="relative w-[64%] max-w-[250px] shrink-0 sm:w-[38%]">
          <div className="rounded-[2.1rem] bg-[#1A1F29] p-[6px] ring-1 ring-[#323B4E] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.95),0_0_0_1px_rgba(0,0,0,0.6)]">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[1.75rem] bg-[var(--bg)] [container-type:inline-size]">
              {/* Lock screen: clock and status, behind the notification */}
              <div className="ssd-anim ssd-idle absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,#18301F,transparent_70%)]">
                <div className="flex justify-between px-[8cqw] pt-[5cqw] text-[5cqw] text-[var(--muted)]">
                  <span>9:41</span>
                  <span>100%</span>
                </div>
                <p className="mt-[10cqw] text-center text-[19cqw] font-light leading-none tracking-tight text-[var(--fg)]">9:41</p>
                <p className="mt-[2cqw] text-center text-[5.2cqw] text-[var(--muted)]">Tuesday</p>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute bottom-[12cqw] left-1/2 size-[7cqw] -translate-x-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" />
                </svg>
              </div>

              {/* Notification */}
              <div className="ssd-anim ssd-notif absolute inset-x-[5cqw] top-[62cqw] rounded-[6cqw] bg-[var(--surface-hi)] p-[5cqw] ring-1 ring-[var(--outline)]">
                <div className="flex items-center gap-[2cqw] text-[4.4cqw] text-[var(--muted)]">
                  <span className="flex size-[6.5cqw] items-center justify-center rounded-full bg-black">
                    <Fingerprint className="size-[4.6cqw] text-[var(--accent)]" />
                  </span>
                  SudoStamp · now
                </div>
                <p className="mt-[2.5cqw] text-[6cqw] font-medium text-[var(--fg)]">Approve sudo on Edith?</p>
                <p className="text-[4.8cqw] text-[var(--muted)]">From 192.168.1.20 · tap to approve</p>
                <p className="mt-[3cqw] text-[5cqw] font-medium text-[var(--danger)]">Deny</p>
                <span className="ssd-anim ssd-tap absolute left-1/2 top-1/2 -ml-[8cqw] -mt-[8cqw] size-[16cqw] rounded-full bg-white/40" />
              </div>

              {/* Approval */}
              <div className="ssd-anim ssd-ask absolute inset-0 flex flex-col items-center px-[7cqw] pb-[7cqw] pt-[13cqw] text-center">
                <p className="text-[4.2cqw] font-semibold tracking-[0.14em] text-[var(--accent)]">SUDO REQUEST</p>
                <div className="relative mt-[6cqw] size-[42cqw]">
                  <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
                    <circle cx="22" cy="22" r="20" fill="none" stroke="var(--outline)" strokeWidth="1.6" />
                    <circle
                      cx="22"
                      cy="22"
                      r="20"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      className="ssd-anim ssd-ring"
                    />
                  </svg>
                  <Fingerprint className="absolute inset-[20%] text-[var(--accent)]" />
                  <span className="ssd-anim ssd-touch absolute inset-[12%] rounded-full bg-[var(--accent)]/30" />
                </div>
                <p className="mt-[5cqw] text-[6.6cqw] font-medium leading-tight text-[var(--fg)]">Approve sudo on Edith?</p>
                <p className="mt-[1.5cqw] font-mono text-[4.4cqw] text-[var(--muted)]">Denied automatically in 48 s</p>
                <div className="mt-[5cqw] w-full rounded-[4cqw] bg-[var(--surface)] px-[4cqw] py-[3cqw] text-left ring-1 ring-[var(--outline)]">
                  <p className="text-[3.6cqw] font-semibold tracking-[0.12em] text-[var(--muted)]">REQUEST FROM</p>
                  <p className="font-mono text-[5cqw] text-[var(--fg)]">192.168.1.20</p>
                  <p className="mt-[1cqw] text-[4cqw] text-[var(--muted)]">Received 9:41 AM</p>
                </div>
                <div className="mt-auto w-full space-y-[2.5cqw]">
                  <div className="w-full rounded-[4cqw] bg-[var(--accent)] py-[3.4cqw] text-[5cqw] font-semibold text-[var(--on-accent)]">
                    Approve with fingerprint
                  </div>
                  <div className="w-full rounded-[4cqw] bg-[var(--danger-soft)] py-[3.4cqw] text-[5cqw] font-medium text-[var(--danger)]">
                    Deny
                  </div>
                </div>
              </div>

              {/* Approved */}
              <div className="ssd-anim ssd-ok absolute inset-0 flex flex-col items-center justify-center px-[8cqw] text-center">
                <div className="flex size-[30cqw] items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <svg viewBox="0 0 24 24" className="size-[17cqw]" aria-hidden="true">
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={30}
                      className="ssd-anim ssd-check"
                    />
                  </svg>
                </div>
                <p className="mt-[6cqw] text-[8cqw] font-semibold text-[var(--accent)]">Approved</p>
                <p className="mt-[1.5cqw] text-[5cqw] text-[var(--muted)]">sudo on Edith can proceed</p>
              </div>
              {/* Home indicator, over every state */}
              <span aria-hidden="true" className="absolute bottom-[2.5cqw] left-1/2 h-[1.2cqw] w-[30cqw] -translate-x-1/2 rounded-full bg-white/35" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
