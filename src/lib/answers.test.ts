import { describe, it, expect } from "vitest";
import { answers, ebayMonths, ebaySince, periodStart, spell, type AnswerIntent } from "./answers";
import { education, experiences, projects, socialLinks, EBAY_SEPARATION } from "./data";
import { notes } from "./notes";

const TODAY = "2026-11-11";
const ask = (q: string, today = TODAY) => answers(q, today);

/** Every phrasing must come back as this intent, and nothing else. */
function intent(name: AnswerIntent, phrasings: string[]) {
  it(`${name}: ${phrasings.join(" | ")}`, () => {
    for (const q of phrasings) expect(ask(q)?.intent, q).toBe(name);
  });
}

describe("the intents, three phrasings each", () => {
  intent("tenure", ["how many years of c++", "years of c++", "how long has he worked in c++"]);
  intent("tenure", ["how long at ebay", "how many years at ebay", "how long has he worked at ebay"]);
  intent("tenure", ["years of experience", "how many years of experience", "how much experience does he have in years"].slice(0, 2));
  intent("location", ["where is he based", "location", "what city does he live in"]);
  intent("location", ["where does he work", "where is ritwick based", "his location"]);
  intent("education", ["what degree does he have", "where did he study", "when did he finish his masters"]);
  intent("education", ["university", "bachelors degree", "where did ritwick go to school"].slice(0, 2));
  intent("contact", ["how do i contact him", "email", "how can i reach him"]);
  intent("contact", ["linkedin", "github", "hire him"]);
  intent("count", ["how many projects", "how many notes", "how many projects has he built"]);
  intent("role", ["what does he do", "current role", "what is his job title"]);
  intent("resume", ["resume", "cv", "download his pdf"]);
  intent("resume", ["where is his resume", "résumé", "his cv"]);
});

describe("tenure arithmetic, against fixed dates", () => {
  it("counts calendar months from the first eBay role's start (Mar 2021)", () => {
    expect(periodStart(experiences[1].period)).toEqual({ year: 2021, month: 2 });
    expect(ebayMonths("2021-03-01")).toBe(0);
    expect(ebayMonths("2022-02-28")).toBe(11);
    expect(ebayMonths("2022-03-01")).toBe(12);
    expect(ebayMonths("2026-11-11")).toBe(68);
  });

  it("is zero-day exact at the boundaries and null before the first role", () => {
    expect(ebayMonths("2021-02-28")).toBeNull();
    expect(ebayMonths("not a date")).toBeNull();
  });

  it("stops at the separation date: a later build says what the build on that day says", () => {
    const at = ebayMonths(EBAY_SEPARATION);
    expect(at).toBe(69);
    expect(ebayMonths("2027-06-30")).toBe(at);
    expect(ebayMonths("2031-01-01")).toBe(at);
    expect(ask("how long at ebay", "2031-01-01")?.answer).toBe(ask("how long at ebay", EBAY_SEPARATION)?.answer);
  });

  it("leaves the as-of date out from the separation day on, so a build date cannot be subtracted from", () => {
    expect(ask("how long at ebay", "2026-12-07")?.source).toContain("as of 7 Dec 2026");
    for (const today of [EBAY_SEPARATION, "2027-03-01"]) {
      for (const q of ["how long at ebay", "where is he based", "how many projects", "what does he do", "where did he study"]) {
        expect(ask(q, today)!.source, `${q} ${today}`).not.toMatch(/as of|\d{4}-\d{2}-\d{2}/);
      }
    }
  });

  it("spells years and months, singular and plural", () => {
    expect(spell(68)).toBe("5 years, 8 months");
    expect(spell(12)).toBe("1 year");
    expect(spell(13)).toBe("1 year, 1 month");
    expect(spell(24)).toBe("2 years");
    expect(spell(5)).toBe("5 months");
    expect(spell(1)).toBe("1 month");
    expect(spell(0)).toBe("0 months");
  });

  it("prints the as-of date as a reader writes it, never as an ISO string", () => {
    for (const q of ["how long at ebay", "where is he based", "how many projects", "what does he do", "where did he study"]) {
      const source = ask(q)!.source;
      expect(source, q).toContain("as of 11 Nov 2026");
      expect(source, q).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  it("puts the computed figure in the answer and the as-of date in the source", () => {
    const a = ask("how many years of c++")!;
    expect(a.answer).toBe("5 years, 8 months, on eBay's C++ search engine.");
    expect(a.source).toContain("from the eBay dates on this page");
    expect(a.source).toContain("as of 11 Nov 2026");
    expect(a.source).toContain("since Mar 2021");
    expect(ebaySince()).toBe("Mar 2021");
    expect(ask("how long at ebay", "2023-06-15")?.answer).toBe("2 years, 3 months at eBay.");
  });

  it("never prints the separation date or the word that announces it", () => {
    const [y, m, d] = EBAY_SEPARATION.split("-");
    for (const q of ["how many years of c++", "how long at ebay", "years of experience", "what does he do", "where is he based"]) {
      for (const today of ["2026-11-11", EBAY_SEPARATION, "2027-03-01"]) {
        const a = ask(q, today)!;
        const text = JSON.stringify(a);
        expect(text, `${q} ${today}`).not.toContain(EBAY_SEPARATION);
        expect(text, `${q} ${today}`).not.toContain(`${m}/${d}`);
        expect(text, `${q} ${today}`).not.toContain(`${d}, ${y}`);
        expect(text, `${q} ${today}`).not.toMatch(/\b(leav|left|until|ends?|ended|last day)/i);
      }
    }
  });
});

describe("what each answer is computed from", () => {
  it("location is the current role's place", () => {
    expect(ask("where is he based")?.answer).toBe(`${experiences[0].location}.`);
  });

  it("education lists every entry with its years, or the one asked for", () => {
    const all = ask("where did he study")!.answer;
    for (const e of education) expect(all).toContain(`${e.degree}, ${e.school}, ${e.period}`);
    const master = ask("when did he finish his masters")!;
    expect(master.answer).toContain("Master of Computer Science, University of California, Irvine, 2019 – 2020");
    expect(master.answer).toBe("Finished in 2020: Master of Computer Science, University of California, Irvine, 2019 – 2020.");
    expect(master.answer).not.toContain("SRM");
    const bachelor = ask("btech degree")!.answer;
    expect(bachelor).toContain("SRM Institute");
    expect(bachelor).not.toContain("Irvine");
  });

  it("contact is the site's own links: all of them, or the one named", () => {
    const all = ask("how do i contact him")!;
    expect(all.links?.map((l) => l.href)).toEqual([`mailto:${socialLinks.email}`, socialLinks.linkedin, socialLinks.github, socialLinks.gitlab]);
    expect(ask("linkedin")?.links?.map((l) => l.href)).toEqual([socialLinks.linkedin]);
    expect(ask("email")?.links?.map((l) => l.href)).toEqual([`mailto:${socialLinks.email}`]);
    expect(ask("github gitlab")?.links?.map((l) => l.href)).toEqual([socialLinks.github, socialLinks.gitlab]);
  });

  it("counts are the lengths of the lists the page draws", () => {
    expect(ask("how many projects")?.answer).toBe(`${projects.length} projects.`);
    expect(ask("how many notes")?.answer).toBe(`${notes.length} notes.`);
    expect(ask("how many projects and notes")?.answer).toBe(`${projects.length} projects and ${notes.length} notes.`);
  });

  it("role is the first role in the work history", () => {
    expect(ask("what does he do")?.answer).toBe(`${experiences[0].role} at ${experiences[0].company}.`);
    expect(ask("current role", "2027-01-01")?.answer).toBe(`Most recently ${experiences[0].role} at ${experiences[0].company}.`);
  });

  it("resume links to the page and the PDF", () => {
    expect(ask("resume")?.links?.map((l) => l.href)).toEqual(["/resume/", "/Ritwick_Verma_Resume.pdf"]);
  });

  it("every answer names the date it was computed as of or the page part it came from", () => {
    for (const q of ["how long at ebay", "where is he based", "where did he study", "how many projects", "what does he do"]) {
      expect(ask(q)!.source, q).toContain("as of 11 Nov 2026");
    }
  });
});

describe("what it will not answer", () => {
  const refused = [
    "visa", "do you need visa sponsorship", "does he need sponsorship", "h1b status", "h-1b", "work authorization", "immigration status",
    "salary", "salary expectations", "compensation", "how much does he cost", "hourly rate",
    "is he available", "availability", "available to start", "notice period", "when can he start",
    "when does he leave", "when does he leave ebay", "how long until he leaves ebay", "how many years at ebay until he leaves", "end date", "ebay end date",
    "when did he leave ebay", "is he looking for a job", "open to work", "job offer",
  ];
  it.each(refused)("null: %s", (q) => {
    expect(ask(q)).toBeNull();
  });

  it("stays silent even when the refused word sits inside an otherwise answerable question", () => {
    for (const q of ["how long at ebay and when does he leave", "contact him about visa", "where is he based and is he available", "email salary"]) {
      expect(ask(q), q).toBeNull();
    }
  });

  it("is null for a tenure it cannot compute, a count it does not have, and a plain search", () => {
    for (const q of ["years of python", "how many years of kubernetes", "years of c++ and python", "how many tests", "how many tests on the site", "fitment", "query rewriting", "where is the homelab", "how many", "traffic replay", ""]) {
      expect(ask(q), q).toBeNull();
    }
  });

  it("is null when the query uses the query language", () => {
    for (const q of ['"years of c++"', "kind:project how many projects", "how many projects -plutus", "tech:kotlin email"]) {
      expect(ask(q), q).toBeNull();
    }
  });

  it("is null for a date it cannot read", () => {
    expect(ask("how long at ebay", "yesterday")).toBeNull();
    expect(ask("how long at ebay", "2026-13-01")).toBeNull();
  });
});

describe("one answer, and the same one every time", () => {
  it("is pure: the same query and date give the same answer", () => {
    expect(ask("how many years of c++")).toEqual(ask("how many years of c++"));
  });

  it("is not thrown by case, accents or spacing", () => {
    expect(ask("  How Many YEARS of C++  ")?.intent).toBe("tenure");
    expect(ask("RÉSUMÉ")?.intent).toBe("resume");
  });
});
