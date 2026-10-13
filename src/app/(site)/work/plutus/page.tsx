import type { Metadata } from "next";
import Sheet from "@/components/Sheet";
import { CaseHeader, Callout, Fig, NextCase, Step } from "@/components/case";
import { PLUTUS_STAGES } from "@/lib/cases";

export const metadata: Metadata = {
  title: "Proving my trading bot doesn’t work",
  description:
    "Plutus, a long-short equity bot: how a +149% backtest became +0.57% out of sample, and the eight method rules that caught every fake result along the way.",
  alternates: { canonical: "/work/plutus/" },
};

const RULES = [
  { rule: "Survivor-only universes are inadmissible", caught: "Dropping unpriced delistings faked a +16% edge (t 1.8). Delisted names now stay in, with a −55% haircut when unpriced." },
  { rule: "Pass an alignment gate first", caught: "An equal-weight book must track SPY at ~0.9 correlation. A one-month misalignment between returns and signals faked 28% a year of alpha." },
  { rule: "Split every long-horizon alpha by decade", caught: "Option-structure ‘alpha’ came entirely from two decades of the 1990s–2000s." },
  { rule: "Size drawdowns on daily marks", caught: "A monthly grid understated the worst drawdown by about 4 points." },
  { rule: "The harness must recover planted truth", caught: "A planted +2%/month alpha came back as +26.2%/yr against a true 26.8% — before any real verdict was trusted." },
  { rule: "Control short-horizon price effects before calling news alpha", caught: "A news-headline score’s 1-day IC of +0.09 (t 2.8) fell below significance once momentum and reversal were controlled." },
  { rule: "Key financial data on the period it describes", caught: "Filing-frame fields mis-keyed quarters until reports were indexed by period end." },
  { rule: "Measure spreads with the market open", caught: "Quotes taken outside trading hours are not the spreads you actually trade at." },
];

const LEDGER = [
  { dir: "Large-cap cross-sectional factors", res: "Walk-forward 2020–24: +0.57% vs SPY +95.3%", v: "dead" },
  { dir: "Text signals (10-K sentiment, 8-K and news LLM scores)", res: "Filing sentiment IC ≈ 0; news score describes the recent past", v: "dead" },
  { dir: "ETF time-series momentum", res: "Risk-managed beta, not alpha", v: "dead" },
  { dir: "Crypto trend-following", res: "Result swings 3× between adjacent parameter values", v: "dead" },
  { dir: "Option premium (volatility risk premium)", res: "Premium real (~4 vol points); the harvest is competed away", v: "dead" },
  { dir: "Microcap post-earnings drift", res: "Net −2.9% after costs, t −1.0", v: "dead" },
  { dir: "Microcap net share issuance", res: "+0.5%/yr, t 0.07 — the apparent edge was delisting accounting", v: "dead" },
  { dir: "Trend gate on a stock/bond mix", res: "Gives up ~1–2 pts of CAGR for 19–35 pts less max drawdown", v: "real" },
] as const;

function StagesFig() {
  const MAX = 150;
  return (
    <div>
    <div className="chart-legend" aria-hidden="true">
      <span><i style={{ background: "var(--signal)" }} />Plutus</span>
      <span><i style={{ background: "var(--ink)" }} />SPY, same window</span>
      <span>scale 0–150%</span>
    </div>
    <div className="stage-rows">
      {PLUTUS_STAGES.map((s, i) => (
        <div key={s.label} className="stage-row">
          <div>
            <div className="label" style={{ color: "var(--ink)" }}>{s.label}</div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{s.note}</div>
          </div>
          <div className="stage-bars">
            <div className="stage-bar">
              <div className="bar-track">
                <div className="bar-fill signal" style={{ width: `${Math.max((s.value / MAX) * 100, 0.6)}%`, transitionDelay: `${i * 120}ms` }} />
              </div>
              <span>Plutus +{s.value}%</span>
            </div>
            {s.bench !== null && (
              <div className="stage-bar">
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(s.bench / MAX) * 100}%` }} />
                </div>
                <span>SPY +{s.bench}%</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

export default function Plutus() {
  return (
    <>
      <CaseHeader
        slug="plutus"
        abstract={
          <p>
            Plutus scores US large caps, goes long the best and short the worst, and paper-trades the result on
            Alpaca. I spent two months trying to prove it has an edge. It doesn’t — and getting to a number I
            trust was the most useful part of the project.
          </p>
        }
      />

      <Sheet no="01" label="The number">
        <div className="case-body">
          <Fig no="1" caption="The headline result at each stage of scrutiny. Same bot, same idea — only the honesty of the test changed. Returns are cumulative over each window.">
            <StagesFig />
          </Fig>

          <Step no="1.1" title="+149% was three bugs">
            <p>
              The first backtest returned <strong>+149%</strong>. Three defects produced it: the profit on a short
              position hitting its hard stop had the wrong sign; the AI signal was being synthesised instead of
              read from real data; and the fundamentals behind the core score were placeholders. Fixed, the same
              bot made <strong>+39% over 2024–25 against SPY’s +49%</strong> — and −8.7% over 2018–22, when SPY
              made +55%.
            </p>
            <p>
              A fourth bug was hiding in plain sight: the 12-1 month momentum factor had never been computed. A
              dead attribute and a 12-<em>day</em> window labelled as 12 months meant the factor everyone assumed
              was working was not there at all.
            </p>
          </Step>

          <Step no="1.2" title="In-sample is a hypothesis, not a result">
            <p>
              With every point-in-time fix in place, a walk-forward test over 2020–24 — each year scored on data
              the model had never seen — returned <strong>+0.57% against SPY’s +95.3%</strong>, a Sharpe of 0.06.
              Momentum’s t-statistic of 3.8 in-sample fell to 1.35 out of sample. Every factor did the same.
            </p>
          </Step>
        </div>
      </Sheet>

      <Sheet no="02" label="Method">
        <div className="case-body">
          <Callout>
            Each of these rules exists because a fake result got past me first. Knowing a bias exists is not the
            same as catching it in your own pipeline.
          </Callout>
          <div className="table-wrap" data-reveal>
            <table className="table">
              <caption className="label">Fig. 2 · Eight rules, and the fake result each one caught</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 36 }}>#</th>
                  <th scope="col">Rule</th>
                  <th scope="col">What it caught</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((r, i) => (
                  <tr key={r.rule}>
                    <td className="v" style={{ color: "var(--signal-text)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td className="k" style={{ whiteSpace: "normal", fontSize: 18, maxWidth: 300 }}>{r.rule}</td>
                    <td>{r.caught}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Step no="2.1" title="Pre-register, then look">
            <p>
              Late in the project, every candidate was written down with its kill criterion and hash-stamped with
              SHA-256 <strong>before any return was read</strong>. That removes the most comfortable failure mode
              in research — deciding what the test was supposed to show after seeing the result.
            </p>
          </Step>
        </div>
      </Sheet>

      <Sheet no="03" label="Ledger">
        <div className="case-body">
          <div className="table-wrap" data-reveal>
            <table className="table">
              <caption className="label">Fig. 3 · Every direction tested, and what happened to it</caption>
              <thead>
                <tr>
                  <th scope="col">Direction</th>
                  <th scope="col" className="hide-sm">Measured result</th>
                  <th scope="col" className="r">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {LEDGER.map((l) => (
                  <tr key={l.dir}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{l.dir}</span>
                      <span className="muted" style={{ display: "block", fontSize: 14, marginTop: 2 }}>
                        <span className="show-sm-only">{l.res}</span>
                      </span>
                    </td>
                    <td className="hide-sm muted" style={{ fontSize: 15 }}>{l.res}</td>
                    <td className="r">
                      <span className={`verdict ${l.v}`}>{l.v === "dead" ? "Falsified" : "Holds"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Step no="3.1" title="What I’d tell a team">
            <p>
              The one effect that survived everything was about risk, not return: a trend gate that trades a point
              or two of growth for a much shallower worst case. The paper account is flat, which is the correct
              outcome for a strategy with no demonstrated edge. The project’s real output is a harness that can
              tell a true result from a bug — and a habit of assuming the bug first.
            </p>
            <p>
              No backtest is allowed to declare success any more. Only pre-registered, out-of-sample results count.
            </p>
          </Step>
        </div>
      </Sheet>

      <NextCase slug="plutus" />
    </>
  );
}
