"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * One IntersectionObserver for the whole page: adds `.is-in` to every
 * [data-reveal] element as it enters the viewport (figures also use it to
 * start their draw-on). Re-runs on route change. The hiding CSS is gated on
 * the `.js` class, so without script every element is simply visible.
 */
export default function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      // A small positive threshold of an absolute margin — NOT a percentage of the
      // element: tall sections on phones can never be 30% visible at once.
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
