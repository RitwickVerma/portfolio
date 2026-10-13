import { describe, it, expect } from "vitest";
import { personJsonLd, jsonLdString } from "./seo";

describe("personJsonLd", () => {
  const p = personJsonLd();

  it("is a schema.org Person with the required fields", () => {
    expect(p["@context"]).toBe("https://schema.org");
    expect(p["@type"]).toBe("Person");
    expect(p.name).toBe("Ritwick Verma");
    expect(p.url).toBe("https://www.ritwickverma.dev");
    expect(p.jobTitle).toBeTruthy();
    expect(p.worksFor.name).toBe("eBay");
  });

  it("lists both alma maters and the three profiles", () => {
    expect(p.alumniOf.map((a) => a.name)).toEqual([
      "University of California, Irvine",
      "SRM Institute of Science and Technology",
    ]);
    expect(p.sameAs).toHaveLength(3);
    for (const url of p.sameAs) expect(url).toMatch(/^https:\/\//);
  });

  it("exposes no contact details", () => {
    expect(JSON.stringify(p)).not.toMatch(/@gmail|phone|tel:/i);
  });
});

describe("jsonLdString", () => {
  it("escapes < so the payload cannot close its script tag", () => {
    expect(jsonLdString({ a: "</script><b>" })).not.toContain("<");
  });
});
