import type { Metadata } from "next";
import { cardMetadata, OG_CARDS } from "@/lib/seo";
import Section from "@/components/Section";
import WidthSpecimen from "@/components/design/WidthSpecimen";
import { LIGHT, DARK, INK, contrast, type Palette } from "@/lib/theme";

const DESCRIPTION =
  "Index, the design language of ritwickverma.dev: five rules, the colour and type tokens, the components, and the three things that are allowed to move.";

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
  { key: "OK", name: "Better", token: "--ok", use: "Only beside a measurement: a rank that rose, a skill that is met.", on: "BG" },
  { key: "WARN", name: "Fault", token: "--warn", use: "Only beside a measurement: a rank that fell, a guest that is down.", on: "BG" },
];

const RULES = [
  ["Rows, not cards.", "Content is an entry in an index: a hairline above it, facts beside it, no box around it. A heavy rule starts a section. The only boxes are things you operate: the search field, a figure, the palette."],
  ["One typeface, three widths.", "Expanded says who or what. Regular is for reading. Condensed carries facts. Monospace is for code, ids and the query plan, and for nothing else."],
  ["Colour means something.", "Blue is a place you can go. Yellow is a match. Green and red appear only next to a number that changed. If a colour is not doing one of those jobs it is not on the page."],
  ["Headings are claims.", "A section's heading is one sentence that could be wrong, and the section is the evidence for it. No labels above headings, no capitals for emphasis, no numbering unless the content is a sequence."],
  ["Nothing moves unless you did something.", "Three animations exist: results settle when the ranking changes, a row is marked when you land on it, and the search box types one query on first load to show that it works. All three stop under reduced motion."],
];

const TYPE = [
  { name: "Name", cls: "wd-wide font-black text-5xl sm:text-6xl leading-[0.9]", sample: "Ritwick Verma", spec: "Archivo, 125% width, weight 900, tracking −0.035em. Once per page." },
  { name: "Claim", cls: "wd-semi font-extrabold text-3xl leading-[1.02]", sample: "Five and a half years on one search engine.", spec: "112% width, weight 800. A section's one sentence." },
  { name: "Lede", cls: "text-lede leading-[1.25]", sample: "I build and self-host the systems I ship.", spec: "100% width, weight 400 to 600, fluid 20 to 28 px." },
  { name: "Reading", cls: "text-base text-fg/85", sample: "Added a per-request cache to the path that retries searches returning too few results.", spec: "100% width, 16 px on 1.6, at most 68 characters a line." },
  { name: "Fact", cls: "fact", sample: "Software Engineer 3, Search Backend, Jun 2023 – Present", spec: "78% width, 15 px, graphite. Dates, roles, stacks." },
  { name: "Code", cls: "font-mono text-xs", sample: "cach  rewrit  50000  cpp", spec: "Martian Mono, 11 to 12 px. Stems, ids, numbers in the plan." },
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

      <Section id="parts" title="A small set of parts." lede={<p>Each one exists because something on the site needed it. There is no component that only decorates.</p>}>
        <ul className="border-b border-border">
          {[
            {
              name: "Row",
              what: "The unit of content: a hairline, a fact in the margin, the thing itself.",
              demo: (
                <div className="border-t border-border py-3 grid grid-cols-[6rem_1fr] gap-x-6">
                  <span className="fact">eBay</span>
                  <span>
                    <span className="link font-semibold">A per-request cache on the search retry path</span>
                    <span className="fact block">Software Engineer 3, Jun 2023 – Present</span>
                  </span>
                </div>
              ),
            },
            {
              name: "Match",
              what: "Ink on the highlighter, in both themes. Used by search, by the notes when you arrive from a result, and by a pressed key.",
              demo: (
                <p>
                  Failures are never <mark>cached</mark>. The <mark>cache</mark> lives for one request.
                </p>
              ),
            },
            {
              name: "Plan terms",
              what: "The border says where a term came from: typed, in a phrase, rewritten, completed, respelled, excluded, or a filter.",
              demo: (
                <p className="flex flex-wrap gap-1.5">
                  {[
                    ["typed", "cach"],
                    ["phrase", "traffic"],
                    ["rewrite", "latency"],
                    ["prefix", "replay"],
                    ["fuzzy", "fitment"],
                    ["excluded", "plutus"],
                    ["filter", "note"],
                  ].map(([source, term]) => (
                    <span key={source} className="term" data-source={source}>
                      {term}
                      <span>{source}</span>
                    </span>
                  ))}
                </p>
              ),
            },
            {
              name: "Buttons",
              what: "Solid is the one thing to do here. Quiet is everything else. Text actions are underlined facts.",
              demo: (
                <p className="flex flex-wrap items-center gap-3">
                  <span className="btn">Email me</span>
                  <span className="btn-quiet">Try a sample posting</span>
                  <span className="fact underline decoration-fg/30 underline-offset-4">Clear</span>
                  <kbd>Ctrl K</kbd>
                </p>
              ),
            },
            {
              name: "Measured bar",
              what: "A bar is always a number from the data, drawn to scale, with the number next to it.",
              demo: (
                <div className="max-w-sm space-y-1.5">
                  {[
                    ["New errors, first replay", 167],
                    ["After the root-cause fix", 6],
                  ].map(([label, n]) => (
                    <div key={label} className="grid grid-cols-[10rem_1fr] items-center gap-3">
                      <span className="fact !text-sm">{label}</span>
                      <span className="flex items-center gap-2">
                        <span className="h-3 bg-fg" style={{ width: `${Math.max(2, (Number(n) / 167) * 100)}%` }} />
                        <span className="font-mono text-xs">{n}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ),
            },
          ].map((p) => (
            <li key={p.name} className="border-t border-border py-6 grid lg:grid-cols-12 gap-x-8 gap-y-3">
              <div className="lg:col-span-4">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="text-fg/80 max-w-[40ch] mt-1">{p.what}</p>
              </div>
              <div className="lg:col-span-8">{p.demo}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tokens" title="Shape, space and time are tokens too." lede={<p>All of it lives at the top of one stylesheet, and the colours are mirrored in TypeScript for the things CSS cannot reach.</p>}>
        <dl className="border-b border-border">
          {[
            ["Page", "--page", "78 rem wide, 20 to 32 px gutters, a 12-column grid inside. Text columns stop at 68 characters."],
            ["Rules", "--border", "1 px at 16% ink between rows. 2 px full ink above a section and around anything you type into."],
            ["Radius", "--r-chip, --r-box", "3 px on chips and keys, 6 px on fields and figures. Nothing is a pill, nothing is a circle but the theme switch."],
            ["Tap", "--dur-tap", "120 ms. Hover and press."],
            ["Settle", "--dur-settle", "320 ms on cubic-bezier(0.22, 1, 0.36, 1). A result row or a tick in the corpus map finding its place."],
            ["Mark", "--dur-mark", "2.4 s. The highlighter on the row you landed on, fading out."],
          ].map(([name, token, what]) => (
            <div key={name} className="border-t border-border py-2.5 grid sm:grid-cols-[9rem_11rem_1fr] gap-x-6">
              <dt className="font-semibold">{name}</dt>
              <dd className="font-mono text-xs text-muted pt-1">{token}</dd>
              <dd className="text-fg/85">{what}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
