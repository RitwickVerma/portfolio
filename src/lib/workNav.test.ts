import { describe, it, expect } from "vitest";
import { experiences } from "./data";
import { workRoles } from "./corpus";

// The timeline's eBay bars link to #work-role-<n>, the heading of the n-th role the Work
// section renders. That only holds while the n-th eBay experience is the n-th work role.
describe("timeline navigation", () => {
  const ebay = experiences.filter((e) => e.company === "eBay");

  it("has one eBay experience for each role the Work section renders", () => {
    expect(ebay).toHaveLength(workRoles.length);
  });

  it("pairs them in order: same title, same dates", () => {
    ebay.forEach((e, i) => {
      expect(workRoles[i].role.startsWith(e.role), e.role).toBe(true);
      expect(workRoles[i].period, e.role).toBe(e.period);
    });
  });
});
