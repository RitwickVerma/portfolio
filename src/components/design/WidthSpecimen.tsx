"use client";

import { useState } from "react";

/** Archivo's width axis, by hand: drag it and watch one typeface become the whole system. */
export default function WidthSpecimen() {
  const [width, setWidth] = useState(125);
  const [weight, setWeight] = useState(900);
  const role = width >= 119 ? "the name" : width >= 106 ? "a heading" : width >= 90 ? "reading text" : "a fact about a thing";
  return (
    <div>
      <p
        className="text-[clamp(2.5rem,9vw,7rem)] leading-[0.9] whitespace-nowrap overflow-hidden -ml-[0.03em]"
        style={{ fontStretch: `${width}%`, fontWeight: weight, letterSpacing: `${(100 - width) * 0.0014}em` }}
      >
        Fitment
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl">
        <label className="block">
          <span className="fact flex justify-between">
            <span>Width</span>
            <span className="font-mono text-[0.7rem]">{width}%</span>
          </span>
          <input type="range" min={62} max={125} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-[var(--fg)]" />
        </label>
        <label className="block">
          <span className="fact flex justify-between">
            <span>Weight</span>
            <span className="font-mono text-[0.7rem]">{weight}</span>
          </span>
          <input type="range" min={100} max={900} step={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full accent-[var(--fg)]" />
        </label>
      </div>
      <p className="mt-3 text-fg/85" aria-live="polite">
        At this width the site would use it for <span className="font-semibold">{role}</span>.
      </p>
    </div>
  );
}
