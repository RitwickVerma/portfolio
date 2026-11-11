import { projects } from "./data";
import type { Project } from "./types";

// The category chips over the project rows. The categories are the ones the
// data uses, in the order the projects first use them; nothing is typed twice.

export type Category = Project["category"];
export type Filter = "all" | Category;

/** Categories in order of first use, each with how many projects carry it. */
export function categories(list: readonly Project[] = projects): { id: Category; count: number }[] {
  const out: { id: Category; count: number }[] = [];
  for (const p of list) {
    const hit = out.find((c) => c.id === p.category);
    if (hit) hit.count += 1;
    else out.push({ id: p.category, count: 1 });
  }
  return out;
}

/** Does a project show under this filter? */
export function matches(filter: Filter, category: Category): boolean {
  return filter === "all" || filter === category;
}

/** A hash that points at a project row ("#p-kaeru") names that row's slug, or null for any other hash. */
export function hashSlug(hash: string): string | null {
  const m = hash.match(/^#p-(.+)$/);
  return m ? m[1] : null;
}

/** The filter to hold after the visitor lands on `hash`: back to All when the row they came for is filtered out. */
export function filterForHash(filter: Filter, hash: string, list: readonly Project[] = projects): Filter {
  const slug = hashSlug(hash);
  if (!slug) return filter;
  const target = list.find((p) => p.slug === slug);
  return target && !matches(filter, target.category) ? "all" : filter;
}
