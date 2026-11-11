import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cardMetadata, OG_CARDS } from "@/lib/seo";
import Section from "@/components/Section";
import WidthSpecimen from "@/components/design/WidthSpecimen";
import { LIGHT, DARK, INK, contrast, type Palette } from "@/lib/theme";
import { workRoles } from "@/lib/corpus";

// The current role as the site sets it everywhere else, so the specimens say "Present" or the month the same way the Work section does.
const CURRENT_ROLE = `${workRoles[0].role}, ${workRoles[0].period}`;

const DESCRIPTION =
  "Index, the design language of ritwickverma.dev: five rules, seven colours and their contrast, one typeface at three widths, and a table of tokens and parts.";

export const metadata: Metadata = {
  title: "The design language",
  description: DESCRIPTION,
  ...cardMetadata(OG_CARDS.design, { socialTitle: "The design language · Ritwick Verma", description: DESCRIPTION }),
};

const ROLES: { key: keyof Palette; name: string; token: string; use: string; on: "BG" | "HIT" }[] = [
  { key: "BG", name: "Paper", token: "--bg", use: "The page. Nothing sits on a card; everything sits on this.", on: "BG" },
  { key: "FG", name: "Ink", token: "--fg", use: "Text, rules, bars. A lit tick in the corpus map.", on: "BG" },
  { key: "MUTED", name: "Graphite", token: "--muted", use: "Facts about a thing: dates, roles, stacks, units.", on: "BG" },
  { key: "ACCENT", name: "Link", token: "--accent", use: "Somewhere you can go. Never decoration.", on: "BG" },
  { key: "HIT", name: "Highlighter", token: "--hit", use: "Something the engine found. Always carries ink.", on: "HIT" },
  { key: "OK", name: "Better", token: "--ok", use: "Only beside a measurement: a rank that rose.", on: "BG" },
  { key: "WARN", name: "Fault", token: "--warn", use: "Only beside a measurement: a rank that fell, a guest that is down.", on: "BG" },
];

const RULES = [
  ["Content is rows, not cards.", "Content is an entry in an index: a hairline above it, facts beside it, no box around it. A heavy rule starts a section. The only boxes are things you operate: the search field, a figure, the palette."],
  ["One typeface carries three widths.", "Expanded says who or what. Regular is for reading. Condensed carries facts. Monospace is for code, ids and the query plan, and for nothing else."],
  ["Colour means something.", "Blue is a place you can go. Yellow is a match. Green and red appear only next to a number that changed. If a colour is not doing one of those jobs it is not on the page."],
  ["Headings are claims.", "A section's heading is one sentence that could be wrong, and the section is the evidence for it. No labels above headings, no capitals for emphasis, no numbering unless the content is a sequence."],
  ["Nothing moves unless you did something.", "Three animations answer something you did: results settle when the ranking changes, a row is marked when you land on it, and the palette settles open. Three more play unprompted, and are this rule's exceptions: the search box types one query on first load to show that it works, the keyboard demo types by itself until you focus it, and the ambilight simulation plays while it is on screen. All of them stop under reduced motion."],
];

const TYPE = [
  { name: "Name", cls: "wd-wide font-black text-5xl sm:text-6xl leading-[0.9]", sample: "Ritwick Verma", spec: "Archivo, 125% width, weight 900, tracking −0.035em. Once per page." },
  { name: "Claim", cls: "wd-semi font-extrabold text-3xl leading-[1.02]", sample: "Five and a half years on one search engine.", spec: "112% width, weight 800. A section's one sentence." },
  { name: "Lede", cls: "text-lede leading-[1.25]", sample: "I build and self-host the systems I ship.", spec: "100% width, weight 400 to 600, fluid 20 to 28 px." },
  { name: "Reading", cls: "text-base text-fg/85", sample: "Added a per-request cache to the path that retries searches returning too few results.", spec: "100% width, 16 px on 1.6, at most 68 characters a line." },
  { name: "Fact", cls: "fact", sample: CURRENT_ROLE, spec: "78% width, 15 px, graphite. Dates, roles, stacks." },
  { name: "Code", cls: "font-mono text-xs", sample: "cach  rewrit  50000  cpp", spec: "Martian Mono, 11 to 12 px. Stems, ids, numbers in the plan." },
];

// Name, token, one line. The parts and the tokens in one list: nothing here is a component that only decorates.
const PARTS: [string, string, ReactNode][] = [
  ["Page", "--page", "78 rem wide, 20 to 32 px gutters, a 12-column grid inside. Text columns stop at 68 characters."],
  ["Row", "--border", "The unit of content: a hairline at 16% ink, a fact in the margin, the thing itself. 2 px full ink above a section and around anything you type into."],
  ["Match", "--hit", "Ink on the highlighter in both themes: search, a note you arrive at from a result, a pressed key."],
  ["Plan term", ".term[data-source]", "The border says where a term came from: typed, in a phrase, rewritten, completed, respelled, excluded, or a filter."],
  ["Button", ".btn, kbd", "Solid is the one thing to do here. Text actions are underlined facts."],
  ["Measured bar", "--fg", "A bar is always a number from the data, drawn to scale, with the number next to it."],
  ["Radius", "--r-chip, --r-box", "3 px on chips and keys, 6 px on fields and figures. Nothing is a pill, nothing is a circle but the theme switch."],
  ["Tap", "--dur-tap", "120 ms. Hover and press."],
  ["Settle", "--dur-settle", <>320 ms on <span className="whitespace-nowrap">cubic-bezier(0.22,</span> 1, 0.36, 1). A result row or a tick in the corpus map finding its place.</>],
  ["Mark", "--dur-mark", "2.4 s. The highlighter on the row you landed on, fading out."],
];

function Swatches({ palette, name }: { palette: Palette; name: string }) {
  return (
    <div className="rounded-[var(--r-box)] border border-border overflow-hidden" style={{ background: palette.BG, color: palette.FG }}>
      <p className="px-4 py-2.5 text-sm font-semibold" style={{ borderBottom: `1px solid ${palette.FG}33` }}>
        {name}
      </p>
      <ul>
        {ROLES.map((r) => {
          const colour = palette[r.key];
          const ground = r.on === "HIT" ? INK : palette.BG;
          const ratio = r.key === "BG" ? null : contrast(colour, ground);
          return (
            <li key={r.key} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 px-4 py-2" style={{ borderTop: `1px solid ${palette.FG}22` }}>
              <span className="h-8 rounded-[3px]" style={{ background: colour, border: `1px solid ${palette.FG}55` }} />
              <span>
                <span className="font-semibold">{r.name}</span>{" "}
                <span className="font-mono text-[0.68rem]" style={{ color: palette.MUTED }}>
                  {colour}
                </span>
              </span>
              <span className="font-mono text-[0.68rem] text-right" style={{ color: palette.MUTED }}>
                {ratio ? `${ratio.toFixed(1)} : 1` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function DesignPage() {
  return (
    <>
      <header className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
        <h1 className="wd-wide text-[clamp(2.75rem,8vw,6.5rem)] font-black leading-[0.9] -ml-[0.04em]">Index</h1>
        <p className="mt-6 text-lede leading-[1.3] max-w-[44ch]">
          The design language of this site. It is named for what the site is: an index of one person&apos;s work, with a search engine on the front.
        </p>
        <p className="mt-4 text-fg/80 max-w-[60ch]">
          A results page has a vernacular everyone already reads: ruled rows, blue links, a highlighted match. Index takes that vernacular seriously and adds
          nothing it does not need. Everything on this page is the live system, drawn from the same tokens as every other page.
        </p>
      </header>

      <Section id="rules" title="Five rules, in the order they get broken.">
        <ol className="border-b border-border">
          {RULES.map(([rule, why], i) => (
            <li key={rule} className="border-t border-border py-5 grid lg:grid-cols-12 gap-x-8 gap-y-1.5">
              <h3 className="lg:col-span-4 text-xl font-semibold leading-snug">
                <span className="font-mono text-xs font-normal text-muted mr-3">{i + 1}</span>
                {rule}
              </h3>
              <p className="lg:col-span-8 text-fg/85 max-w-[68ch]">{why}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="colour"
        title="Seven colours, each with one job."
        lede={
          <p>
            Both palettes, with each colour&apos;s contrast against the ground it sits on. A unit test holds text and links at 7 : 1 or better and everything
            else at 4.5 : 1.
          </p>
        }
      >
        <div className="grid md:grid-cols-2 gap-6">
          <Swatches palette={LIGHT} name="Light" />
          <Swatches palette={DARK} name="Dark" />
        </div>
        <dl className="mt-10 border-b border-border">
          {ROLES.map((r) => (
            <div key={r.key} className="border-t border-border py-2.5 grid sm:grid-cols-[9rem_7rem_1fr] gap-x-6">
              <dt className="font-semibold">{r.name}</dt>
              <dd className="font-mono text-xs text-muted pt-1">{r.token}</dd>
              <dd className="text-fg/85">{r.use}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        id="type"
        title="One typeface does all of it."
        lede={<p>Archivo is a variable family with a width axis from 62% to 125%. The site picks three points on it and gives each a job. Drag the slider to see the range.</p>}
      >
        <WidthSpecimen />
        <ul className="mt-12 border-b border-border">
          {TYPE.map((t) => (
            <li key={t.name} className="border-t border-border py-5 grid lg:grid-cols-12 gap-x-8 gap-y-2 items-baseline">
              <div className="lg:col-span-3">
                <p className="font-semibold">{t.name}</p>
                <p className="fact">{t.spec}</p>
              </div>
              <p className={`lg:col-span-9 ${t.cls}`}>{t.sample}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="tokens"
        title="Each part and token exists because something on the site needed it."
        lede={<p>All of it lives at the top of one stylesheet, and the colours are mirrored in TypeScript for the things CSS cannot reach.</p>}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="fact border-b border-fg">
              <th scope="col" className="font-normal py-2 pr-4 w-[6.5rem] sm:w-[9rem]">
                Name
              </th>
              <th scope="col" className="font-normal py-2 pr-4 w-[13rem] max-sm:hidden">
                Token
              </th>
              <th scope="col" className="font-normal py-2">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {PARTS.map(([name, token, what]) => {
              // Each token is one unbreakable piece: a wrapped "--r-" reads as a typo.
              const pieces = token.split(", ").map((t, i, all) => (
                <span key={t}>
                  <span className="inline-block whitespace-nowrap">
                    {t}
                    {i < all.length - 1 ? "," : ""}
                  </span>
                  {i < all.length - 1 ? " " : ""}
                </span>
              ));
              return (
                <tr key={name} className="border-b border-border align-baseline">
                  <th scope="row" className="font-semibold py-2.5 pr-4 text-left align-baseline">
                    {name}
                  </th>
                  <td className="font-mono text-xs text-muted py-2.5 pr-4 max-sm:hidden">{pieces}</td>
                  <td className="text-fg/85 py-2.5">
                    <p className="max-w-[68ch]">{what}</p>
                    {/* On a phone the token moves under the sentence: a third column would leave the sentence no width. */}
                    <span className="sm:hidden block font-mono text-xs text-muted mt-1" aria-hidden="true">
                      {pieces}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </>
  );
}
