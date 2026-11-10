"use client";

import { useState } from "react";
import { FigureFrame, Fold, Presets, Verdict } from "./kit";
import { UNIVERSES, SPY, WINDOW, gap, pctText, type UniverseRow } from "@/lib/plutusResults";

// The same strategy code, three lists of stocks it may pick from. The numbers
// are the ones recorded in the strategy's own results file; the bars are drawn
// to scale from them (yearly return, 0 to 25% across the width).

const SCALE = 25;
const SHORT: Record<UniverseRow["id"], string> = { today: "Today's members", then: "Members at the time", ever: "Everyone who was ever in" };
const PRESETS = [
  { id: "today", label: SHORT.today },
  { id: "then", label: SHORT.then },
  { id: "ever", label: SHORT.ever },
] as const;

function Row({ label, value, on, outline }: { label: string; value: number; on: boolean; outline?: boolean }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className={`text-[0.95rem] leading-snug ${on ? "font-semibold text-fg" : "text-fg/75"}`}>{label}</span>
        <span className="wd-semi text-xl font-bold tabular-nums text-fg">{pctText(value)}</span>
      </div>
      <div className="mt-1 h-5 bg-surface" aria-hidden="true">
        <div className={`h-full ${outline ? "border-[1.5px] border-fg/60" : on ? "bg-fg" : "bg-fg/25"}`} style={{ width: `${(value / SCALE) * 100}%` }} />
      </div>
    </li>
  );
}

export default function UniverseSwitch() {
  const [id, setId] = useState<UniverseRow["id"]>("today");
  const sel = UNIVERSES.find((u) => u.id === id)!;
  const then = UNIVERSES[0];
  const vsSpy = Math.round((sel.cagr - SPY.cagr) * 10) / 10;
  const behind = gap(sel, then);

  return (
    <FigureFrame
      claim="Same rule, same prices: 21.3% a year choosing from today's index, 3.1% choosing from the index of the day."
      how={
        <>
          The index is the S&amp;P 500, a list of about 500 big US companies that changes every month. Press <b className="font-semibold text-fg">Members at the time</b> to give the rule only the companies that were on the list then.
        </>
      }
      caption={`Real results of the strategy's own backtest on public prices, three runs of one setting over ${WINDOW}, stocks only: a shorter window and a narrower strategy than the 26.1% table further down.`}
      about={
        <>
          <p>
            Source: the private repository&apos;s survivorship write-up (battery 19): point-in-time S&amp;P 500 membership, Alpaca prices, the live configuration with stocks only. 747 of the 763 names that were ever members had prices; 244 of
            those later left the index or were delisted, and 503 were still in it at the last snapshot. SPY&apos;s Sharpe and drawdown are from the README&apos;s table.
          </p>
          <p>Three runs are not a distribution. The gap is what this data shows; it is not an estimate with an interval.</p>
        </>
      }
    >
      <Presets label="Pick from" items={PRESETS} active={id} onPick={setId} />
      <ol aria-label="Yearly return by list of stocks">
        {UNIVERSES.slice()
          .reverse()
          .map((u) => (
            <Row key={u.id} label={SHORT[u.id]} value={u.cagr} on={u.id === id} />
          ))}
        <Row label="SPY, bought and held" value={SPY.cagr} on={false} outline />
      </ol>
      <Verdict tone={sel.cagr < SPY.cagr ? "warn" : "plain"} title={`${SHORT[id]}: ${pctText(sel.cagr)} a year.`}>
        {id === "then" ? (
          <>
            That is {Math.abs(vsSpy).toFixed(1)} points behind SPY, and {gap(UNIVERSES[2], then).toFixed(1)} behind the same rule on today&apos;s members. Same code, same prices, same window: only the list changed.
          </>
        ) : (
          <>
            That is {Math.abs(vsSpy).toFixed(1)} points {vsSpy < 0 ? "behind" : "ahead of"} SPY, and {behind.toFixed(1)} ahead of the same rule on the members of the day, which earned {pctText(then.cagr)}.
            {id === "ever" ? " A name may be picked before it was ever a member." : " Today's list already knows which companies made it."}
          </>
        )}
      </Verdict>
      <Fold summary="The numbers">
        <table className="w-full text-[0.95rem] border-collapse">
          <caption className="sr-only">Same strategy, {WINDOW}, stocks only: yearly return, Sharpe ratio and deepest fall by the list it picked from</caption>
          <thead className="fact text-left">
            <tr>
              <th scope="col" className="border-b border-fg py-1.5 pr-3 font-normal">List</th>
              <th scope="col" className="border-b border-fg py-1.5 pr-3 font-normal">Yearly return</th>
              <th scope="col" className="border-b border-fg py-1.5 pr-3 font-normal">Sharpe</th>
              <th scope="col" className="border-b border-fg py-1.5 font-normal">Deepest fall</th>
            </tr>
          </thead>
          <tbody>
            {UNIVERSES.map((u) => (
              <tr key={u.id}>
                <th scope="row" className="border-b border-border py-1.5 pr-3 text-left font-normal">{SHORT[u.id]}</th>
                <td className="border-b border-border py-1.5 pr-3 tabular-nums">{pctText(u.cagr)}</td>
                <td className="border-b border-border py-1.5 pr-3 tabular-nums">{u.sharpe.toFixed(2)}</td>
                <td className="border-b border-border py-1.5 tabular-nums">{pctText(u.maxDrawdown)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="border-b border-border py-1.5 pr-3 text-left font-normal">SPY</th>
              <td className="border-b border-border py-1.5 pr-3 tabular-nums">{pctText(SPY.cagr)}</td>
              <td className="border-b border-border py-1.5 pr-3 tabular-nums">{SPY.sharpe.toFixed(2)}</td>
              <td className="border-b border-border py-1.5 tabular-nums">{pctText(SPY.maxDrawdown, 0)}</td>
            </tr>
          </tbody>
        </table>
        <p className="fact mt-2">Sharpe is return per unit of ups and downs; higher is better.</p>
      </Fold>
    </FigureFrame>
  );
}
