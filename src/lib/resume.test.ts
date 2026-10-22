import { describe, expect, it } from "vitest";
import { resume } from "./resume";

const all = JSON.stringify(resume);

describe("resume page data (generated from the PDF builder's base.json)", () => {
  it("has the summary, both eBay roles and projects", () => {
    expect(resume.summary).toContain("Cassini");
    expect(resume.roles.map((r) => r.role)).toEqual([
      "Software Engineer 3, Search Backend (promoted from SE2)",
      "Software Engineer 2, Search Backend",
    ]);
    expect(resume.projects.length).toBeGreaterThanOrEqual(2);
  });

  it("carries no AI-writing tells or retired claims", () => {
    expect(all).not.toContain("—");
    expect(all).not.toContain("~");
    expect(all).not.toMatch(/Sharpe 1\.04/);
  });
});
