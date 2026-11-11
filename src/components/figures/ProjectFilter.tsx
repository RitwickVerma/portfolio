"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Segmented } from "@/components/figures/kit";
import { matches, filterForHash, hashSlug, type Category, type Filter } from "@/lib/projectFilter";

// The category chips over the project rows. Every row is in the server HTML
// and stays in the page (a result link to #p-<slug> must find its row), so
// the filter only sets `hidden` on the ones that do not match. Without
// JavaScript the page is the unfiltered list and the chips are not drawn.

export interface FilterItem {
  slug: string;
  category: Category;
  featured: boolean;
  node: ReactNode;
}

export default function ProjectFilter({
  categories,
  items,
  featuredClass,
  restClass,
}: {
  categories: { id: Category; label: string; count: number }[];
  items: FilterItem[];
  featuredClass: string;
  restClass: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  // False in the server HTML and until hydration, true after: without JavaScript no chips are drawn.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // A link to a row the filter hides (a search result, say) lifts the filter and takes you there.
  useEffect(() => {
    const onHash = () => {
      const slug = hashSlug(window.location.hash);
      setFilter((f) => filterForHash(f, window.location.hash));
      if (slug) requestAnimationFrame(() => document.getElementById(`p-${slug}`)?.scrollIntoView());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const shown = items.filter((i) => matches(filter, i.category));
  const options = [{ id: "all" as Filter, label: `All ${items.length}` }, ...categories.map((c) => ({ id: c.id as Filter, label: c.count > 1 ? `${c.label} ${c.count}` : c.label }))];
  const group = (featured: boolean) =>
    items
      .filter((i) => i.featured === featured)
      .map((i) => (
        <div key={i.slug} className="contents" hidden={!matches(filter, i.category)}>
          {i.node}
        </div>
      ));

  return (
    <>
      {ready ? (
        <div className="mb-8">
          <Segmented label="Show" options={options} value={filter} onChange={setFilter} />
          <p className="fact mt-2" aria-live="polite">
            {filter === "all" ? "" : `${shown.length} of ${items.length} projects.`}
          </p>
        </div>
      ) : null}
      <div className={featuredClass} hidden={!shown.some((i) => i.featured)}>
        {group(true)}
      </div>
      <div className={restClass} hidden={!shown.some((i) => !i.featured)}>
        {group(false)}
      </div>
    </>
  );
}
