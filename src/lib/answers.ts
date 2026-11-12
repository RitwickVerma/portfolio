import { education, experiences, projects, socialLinks, EBAY_SEPARATION } from "./data";
import { dateLabel } from "./liveness";
import { notes } from "./notes";
import { parseQuery, tokenize, QUESTION_WORDS } from "./search";

// Direct answers for the hero box. A question the record can answer from its own dates, places and counts
// is answered above the results, with where the answer came from. Nothing here is typed in: every figure is
// computed from lib/data (the same source the page, /resume and the index read), as of a date the caller
// passes, so a test can pin the arithmetic and the page can say when it was computed.
//
// A query is answered only when every word of it is accounted for: the words that ask the question and the
// words that name its subject. "years of c++" is a tenure question; "years of python" is not, because the
// record has no python dates to compute from, and an answer to a different question would be worse than none.
// Pure: no DOM, no clock (the date comes in as an argument).

export type AnswerIntent = "tenure" | "location" | "education" | "contact" | "count" | "role" | "resume";

export interface AnswerLink {
  label: string;
  href: string;
  /** Opens in a new tab: an address off this site. */
  external?: boolean;
}

export interface Answer {
  intent: AnswerIntent;
  /** The query as the engine understood it, written out as a question. */
  question: string;
  /** What it is about, when the intent has more than one: "c++" or "eBay". */
  subject?: string;
  /** The answer as plain text. */
  answer: string;
  /** Where each link in the answer goes. When present the row draws these in place of the plain text. */
  links?: AnswerLink[];
  /** One line saying what it was computed from, and as of when. */
  source: string;
  /** The place on this site the answer comes from. */
  href: string;
}

/** The stems of a space-separated word list, as the engine reads them, question words ("how", "many") kept: the intents are built from them. */
function stems(words: string): Set<string> {
  return new Set(words.split(" ").flatMap((w) => tokenize(w, QUESTION_WORDS)));
}

/** What the record will not say, however it is asked: visas, pay, availability, the end date. Checked before anything. */
const REFUSED = stems(
  [
    "visa visas immigration immigrant h1b h-1b 1b sponsor sponsored sponsorship citizen citizenship green card",
    "authorization authorisation authorized eligible eligibility permit",
    "salary salaries compensation comp pay paid paying wage wages rate hourly cost price fee fees much expect",
    "available availability avail notice start starting begin join joining free open looking offer opportunity",
    "leave leaves leaving left quit quitting resign resigned laid layoff layoffs fired separation separate depart departing",
    "end ends ended date deadline relocate relocation",
  ].join(" "),
);

/** The words that may sit in a query beside each intent's own words. Anything else and the query is not ours to answer. */
const PEOPLE = "he his him ritwick verma s do does did";

const TENURE_ASK = stems("year years long tenure");
const TENURE_FILL = stems(`${PEOPLE} how many much long year years tenure experience work worked working total professional been being time spent career now currently company industry`);
const TENURE_EBAY = stems("ebay cassini");
const TENURE_CPP = stems("c++");
const TENURE_EXPERIENCE = stems("experience");

const EDU_ASK = stems("degree degrees master masters university school study studied studying graduate graduated graduation education college bachelor bachelors btech ms mcs uci srm irvine alma mater undergrad undergraduate");
const EDU_FILL = stems(`${PEOPLE} where when how what year years finish finished complete completed get got earn earned from hold computer science engineering`);
const EDU_MASTER = stems("master masters ms mcs uci irvine");
const EDU_BACHELOR = stems("btech bachelor bachelors srm undergrad undergraduate");
const EDU_WHEN = stems("when finish finished complete completed graduate graduated graduation year years");

const LOC_ASK = stems("base based location located locate city live lives where country town");
const LOC_NAMES_PLACE = stems("base based location located locate city live lives country town");
const HIM = stems("he his him ritwick verma");
const LOC_FILL = stems(`${PEOPLE} where base based location located locate city live lives country town area office work works working current currently now`);

const COUNT_ASK = stems("many count number total");
const COUNT_THING = stems("project projects note notes");
const COUNT_FILL = stems(`${PEOPLE} how many count number total there are site website page portfolio here listed list built build made make written write wrote shipped ship published publish engineering`);

const ROLE_ASK = stems("role title job position occupation profession living");
const ROLE_FILL = stems(`${PEOPLE} role title job position occupation profession living current currently now doing work works working`);

const CONTACT_ASK = stems("contact email mail reach hire linkedin github gitlab touch");
const CONTACT_FILL = stems(`${PEOPLE} how can could would get contact email mail address reach hire linkedin github gitlab touch profile link links page where find send message info information details`);
const CONTACT_EMAIL = stems("email mail");
const CONTACT_PLACES = new Map<string, string>([
  ["linkedin", "linkedin"],
  ["github", "github"],
  ["gitlab", "gitlab"],
]);

const RESUME_ASK = stems("resume cv pdf");
const RESUME_FILL = stems(`${PEOPLE} resume cv pdf download copy get see view read where can find`);

/**
 * The words that only ask or connect ("how", "many", "does", "his"): what an answered query is built from besides
 * its subject. The line under the box does not report respelling one of these ("many" is not a word of the
 * record, and the engine would offer "main"): the words were read as the question.
 */
export function isQuestionWord(term: string): boolean {
  return [TENURE_FILL, EDU_FILL, LOC_FILL, COUNT_FILL, ROLE_FILL, CONTACT_FILL, RESUME_FILL].some((set) => set.has(term));
}

/** Every term is one of the words some set allows. */
const allIn = (terms: string[], allowed: Set<string>[]): boolean => terms.every((t) => allowed.some((s) => s.has(t)));
const any = (terms: string[], set: Set<string>): boolean => terms.some((t) => set.has(t));

// ─── Dates ──────────────────────────────────────────────────────────────────

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Mar 2021 – Jun 2023" and "Jun – Sep 2020" (a start with no year takes the end's): the month a period starts, as year and month index. */
export function periodStart(period: string): { year: number; month: number } | null {
  const m = /^([A-Za-z]{3})[a-z]*(?:\s+(\d{4}))?\s*[–-]/.exec(period.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  const year = m[2] ? Number(m[2]) : Number(/(\d{4})\s*$/.exec(period)?.[1]);
  return month < 0 || !year ? null : { year, month };
}

/** A YYYY-MM-DD date as year and month index, or null for anything else. */
function ymd(date: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? { year: Number(m[1]), month: Number(m[2]) - 1 } : null;
}

/** The first eBay role's start as the page prints it ("Mar 2021"): what the tenure is counted from. */
export function ebaySince(): string | null {
  const starts = experiences
    .filter((e) => e.company === "eBay")
    .map((e) => periodStart(e.period))
    .filter((s) => s !== null);
  if (starts.length === 0) return null;
  const first = starts.reduce((a, b) => (a.year * 12 + a.month <= b.year * 12 + b.month ? a : b));
  return `${MONTHS[first.month][0].toUpperCase()}${MONTHS[first.month].slice(1)} ${first.year}`;
}

/** Whole calendar months from the first eBay role's start to `today`, stopping at the last day: the same rule that turns "Present" into a month. */
export function ebayMonths(today: string): number | null {
  if (!ymd(today)) return null;
  const starts = experiences
    .filter((e) => e.company === "eBay")
    .map((e) => periodStart(e.period))
    .filter((s) => s !== null);
  const now = ymd(today >= EBAY_SEPARATION ? EBAY_SEPARATION : today);
  if (starts.length === 0 || !now) return null;
  const first = starts.reduce((a, b) => (a.year * 12 + a.month <= b.year * 12 + b.month ? a : b));
  const months = now.year * 12 + now.month - (first.year * 12 + first.month);
  return months < 0 ? null : months;
}

/** 68 -> "5 years, 8 months"; 12 -> "1 year"; 5 -> "5 months". */
export function spell(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (y === 0) return part(m, "month");
  return m === 0 ? part(y, "year") : `${part(y, "year")}, ${part(m, "month")}`;
}

// ─── Intents ────────────────────────────────────────────────────────────────

const ROLE = experiences[0];

/**
 * ", as of 11 Nov 2026" while the role runs. From the separation day on it is left out: the date a build was made
 * on is then the one thing a reader could subtract the end from, and the page says nothing of it but "Dec 2026".
 */
function asOf(today: string): string {
  return today >= EBAY_SEPARATION ? "" : `, as of ${dateLabel(today)}`;
}

function tenure(terms: string[], today: string): Answer | null {
  if (!any(terms, TENURE_ASK)) return null;
  const subject = any(terms, TENURE_CPP) ? "cpp" : any(terms, TENURE_EBAY) ? "ebay" : "";
  // Anything this does not know the dates of (python, kubernetes, search) is not a tenure it can compute.
  if (!allIn(terms, [TENURE_FILL, TENURE_EBAY, TENURE_CPP])) return null;
  const months = ebayMonths(today);
  if (months === null) return null;
  const t = spell(months);
  const from = `Computed from the eBay dates on this page, since ${ebaySince()}`;
  if (!subject && !any(terms, TENURE_EXPERIENCE)) return null;
  if (subject === "cpp") {
    return {
      intent: "tenure",
      subject: "c++",
      question: "How long has he worked in C++?",
      answer: `${t}, on eBay's C++ search engine.`,
      source: `${from}${asOf(today)}. The engine is C++, so the C++ tenure is the eBay tenure.`,
      href: "/#work",
    };
  }
  if (subject === "ebay") {
    return {
      intent: "tenure",
      subject: "eBay",
      question: "How long has he been at eBay?",
      answer: `${t} at eBay.`,
      source: `${from}${asOf(today)}.`,
      href: "/#work",
    };
  }
  return {
    intent: "tenure",
    question: "How many years of experience does he have?",
    answer: `${t} at eBay.`,
    source: `${from}${asOf(today)}. Internships are not added.`,
    href: "/#work",
  };
}

function educationAnswer(terms: string[], today: string): Answer | null {
  if (!any(terms, EDU_ASK) || !allIn(terms, [EDU_FILL, EDU_ASK])) return null;
  const master = any(terms, EDU_MASTER);
  const bachelor = any(terms, EDU_BACHELOR);
  const pick = education.filter((e) => (master === bachelor ? true : master ? /^master/i.test(e.degree) : /^btech|^bachelor/i.test(e.degree)));
  if (pick.length === 0) return null;
  const line = (e: (typeof education)[number]) => `${e.degree}, ${e.school}, ${e.period}`;
  const finished = pick.length === 1 && any(terms, EDU_WHEN) ? /(\d{4})\s*$/.exec(pick[0].period)?.[1] : undefined;
  return {
    intent: "education",
    question: pick.length === 1 ? `Where did he get his ${master ? "master's" : "bachelor's"} degree${finished ? ", and when did it end" : ""}?` : "Where did he study?",
    answer: finished ? `Finished in ${finished}: ${line(pick[0])}.` : pick.map(line).join("; ") + ".",
    source: `From the education entries on this page${asOf(today)}.`,
    href: "/#work",
  };
}

function location(terms: string[], today: string): Answer | null {
  if (!any(terms, LOC_ASK) || !allIn(terms, [LOC_FILL])) return null;
  // "where" alone, or "where is the homelab", is not about him.
  if (!any(terms, LOC_NAMES_PLACE) && !any(terms, HIM)) return null;
  if (!ROLE.location) return null;
  return {
    intent: "location",
    question: "Where is he based?",
    answer: `${ROLE.location}.`,
    source: `Taken from the place on the current role${asOf(today)}.`,
    href: "/#contact",
  };
}

function counts(terms: string[], today: string): Answer | null {
  if (!any(terms, COUNT_ASK) || !any(terms, COUNT_THING) || !allIn(terms, [COUNT_FILL, COUNT_THING])) return null;
  const parts: string[] = [];
  const things: string[] = [];
  if (any(terms, stems("project projects"))) {
    parts.push(`${projects.length} ${projects.length === 1 ? "project" : "projects"}`);
    things.push("projects");
  }
  if (any(terms, stems("note notes"))) {
    parts.push(`${notes.length} ${notes.length === 1 ? "note" : "notes"}`);
    things.push("notes");
  }
  const onlyNotes = things.length === 1 && things[0] === "notes";
  return {
    intent: "count",
    question: `How many ${things.join(" and ")} are on this site?`,
    answer: `${parts.join(" and ")}.`,
    source: `Counted from the ${things.join(" and ")} listed on this page${asOf(today)}.`,
    href: onlyNotes ? "/#notes" : "/#projects",
  };
}

function role(terms: string[], today: string): Answer | null {
  if (!allIn(terms, [ROLE_FILL])) return null;
  const direct = any(terms, ROLE_ASK);
  // "what does he do": the verb alone is enough when it is about him.
  const asksDo = terms.includes("do") && any(terms, HIM);
  if (!direct && !asksDo) return null;
  const ended = today >= EBAY_SEPARATION;
  return {
    intent: "role",
    question: ended ? "What was his most recent role?" : "What is his current role?",
    answer: `${ended ? "Most recently " : ""}${ROLE.role} at ${ROLE.company}.`,
    source: `Taken from the first role in the work history${asOf(today)}.`,
    href: "/#work",
  };
}

function contact(terms: string[]): Answer | null {
  if (!any(terms, CONTACT_ASK) || !allIn(terms, [CONTACT_FILL])) return null;
  const wanted = new Set(terms.map((t) => CONTACT_PLACES.get(t)).filter((p) => p !== undefined));
  const email = any(terms, CONTACT_EMAIL);
  const all = !email && wanted.size === 0;
  const links: AnswerLink[] = [];
  if (all || email) links.push({ label: socialLinks.email, href: `mailto:${socialLinks.email}` });
  if (all || wanted.has("linkedin")) links.push({ label: "LinkedIn", href: socialLinks.linkedin, external: true });
  if (all || wanted.has("github")) links.push({ label: "GitHub", href: socialLinks.github, external: true });
  if (all || wanted.has("gitlab")) links.push({ label: "GitLab", href: socialLinks.gitlab, external: true });
  return {
    intent: "contact",
    question: "How can he be reached?",
    answer: links.map((l) => l.label).join(", "),
    links,
    source: "The links in the contact section of this page.",
    href: "/#contact",
  };
}

function resumeAnswer(terms: string[]): Answer | null {
  if (!any(terms, RESUME_ASK) || !allIn(terms, [RESUME_FILL])) return null;
  return {
    intent: "resume",
    question: "Where is his resume?",
    answer: "Read it on this site, or download the PDF.",
    links: [
      { label: "Resume", href: socialLinks.resume },
      { label: "PDF", href: "/Ritwick_Verma_Resume.pdf" },
    ],
    source: "The resume page and the PDF of this site.",
    href: socialLinks.resume,
  };
}

/**
 * The one direct answer to `query`, or null. `today` is YYYY-MM-DD: the build's date on the site, a fixed one
 * in a test. Null for anything that is not plainly one of the intents above, for a query that uses the query
 * language (a phrase, a filter, an exclusion), and always for visas, pay, availability and the end of the role.
 */
export function answers(query: string, today: string): Answer | null {
  const parsed = parseQuery(query);
  if (parsed.phrases.length > 0 || parsed.excluded.length > 0 || parsed.excludedPhrases.length > 0 || parsed.kinds.length > 0 || parsed.tech.length > 0 || parsed.unknownKinds.length > 0) return null;
  // The search leaves the question words out of the index; the answer is read from them, so keep them here.
  const terms = tokenize(query, QUESTION_WORDS);
  if (terms.length === 0 || terms.length > 10) return null;
  if (!ymd(today)) return null;
  if (any(terms, REFUSED)) return null;
  return (
    tenure(terms, today) ??
    educationAnswer(terms, today) ??
    location(terms, today) ??
    counts(terms, today) ??
    role(terms, today) ??
    contact(terms) ??
    resumeAnswer(terms)
  );
}
