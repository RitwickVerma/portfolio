import { search, type SearchIndex } from "./search";

// What a skill chip counts: the results the search box gives when a visitor
// types the skill. The chip is a link to /?q=<skill>, and the number on it is
// `search(index, skill).hits.length` over the same full index the site builds
// (the record plus every section of every note), so pressing the chip shows
// that many results. Nothing is tokenised or matched here: the engine does it,
// the number cannot drift from what the link returns, and it is computed at
// build, so the page needs no JS for it.
//
// The skills lists are documents of that index too, and so they come back as
// results; the count is of results, and the lists are not filtered out.

export interface SkillCount {
  skill: string;
  /** How many results the search gives for this skill. */
  count: number;
  /** The ids of those results, in rank order. */
  ids: string[];
}

export function countSkill(skill: string, index: SearchIndex): SkillCount {
  const ids = search(index, skill).hits.map((h) => h.doc.id);
  return { skill, count: ids.length, ids };
}

export interface SkillGroup {
  label: string;
  skills: SkillCount[];
}

/**
 * Count every skill of every group against `index`, which is the whole index. Within a group the
 * chips come most results first (ties keep the data file's order): read as a row of numbers, the
 * data file's order looked random (18, 11, 11, 6, 43), and a number a reader cannot see the order of
 * reads as noise.
 */
export function skillEvidence(groups: { label: string; items: readonly string[] }[], index: SearchIndex): { groups: SkillGroup[]; documents: number } {
  return {
    documents: index.docs.length,
    groups: groups.map((g) => ({
      label: g.label,
      skills: g.items
        .map((s, i) => ({ c: countSkill(s, index), i }))
        .sort((a, b) => b.c.count - a.c.count || a.i - b.i)
        .map((x) => x.c),
    })),
  };
}

/** The link a chip carries: the real search, with the skill typed into the box. */
export function skillHref(skill: string): string {
  return `/?q=${encodeURIComponent(skill)}`;
}
