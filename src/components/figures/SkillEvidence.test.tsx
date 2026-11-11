import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SkillChips } from "./SkillEvidence";

const groups = [
  {
    label: "Tools",
    skills: [
      { skill: "Nothing found", count: 0, ids: [] },
      { skill: "C++", count: 15, ids: [] },
      { skill: "One", count: 1, ids: ["x"] },
    ],
  },
];
const html = renderToStaticMarkup(<SkillChips groups={groups} documents={115} />);

describe("skill chips", () => {
  it("say what the number is, in the words of the brief", () => {
    expect(html).toContain("results when searched");
    expect(html).toContain("over all 115 documents");
  });

  it("a counted chip shows its number and links to the search; its visible text leads its accessible name", () => {
    expect(html).toContain('href="/?q=C%2B%2B"');
    expect(html).toMatch(/C\+\+<span[^>]*>15<\/span><span class="sr-only"> results when searched<\/span>/);
    expect(html).toContain("1</span><span class=\"sr-only\"> result when searched");
    expect(html).not.toContain("aria-label");
  });

  it("names the dashed chip in the legend only when there is one", () => {
    expect(html).toContain("Dashed: listed, not found in the record.");
    const none = renderToStaticMarkup(<SkillChips groups={[{ label: "Tools", skills: [{ skill: "C++", count: 15, ids: [] }] }]} documents={115} />);
    expect(none).not.toContain("Dashed");
    expect(none).not.toContain("data-unseen");
  });

  it("a skill with no hits is still shown, after the counted ones, and marked", () => {
    expect(html).toContain('data-unseen=""');
    expect(html).toContain("listed, not found in the record");
    expect(html.indexOf("Nothing found")).toBeGreaterThan(html.indexOf("One"));
  });
});
