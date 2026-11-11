import Link from "next/link";
import { projects } from "@/lib/data";
import { projectAnchor } from "@/lib/corpus";
import Section from "@/components/Section";
import Ambilight from "@/components/figures/Ambilight";
import InfiniteCanvas from "@/components/figures/InfiniteCanvas";
import ProjectFilter from "@/components/figures/ProjectFilter";
import { Fold } from "@/components/figures/kit";
import { categories } from "@/lib/projectFilter";
import { BUILD_DATE } from "@/lib/data";
import { livenessFor, livenessLine, lineText, type Generated } from "@/lib/liveness";
import generated from "@/lib/liveness.generated.json";

/** Projects whose idea can be run on the page. */
const FIGURES: Record<string, React.ReactNode> = {
  "tizen-ambilight": <Ambilight />,
  "kwin-canvas": <InfiniteCanvas />,
};

type ProjectData = (typeof projects)[number];

const CATEGORY_LABEL: Record<ProjectData["category"], string> = {
  android: "Android",
  quant: "Quant research",
  infra: "Infrastructure",
  tv: "Smart TV",
  firmware: "Firmware",
  games: "Games",
  desktop: "KDE Plasma",
  security: "Security",
  foldable: "Galaxy Fold",
  linux: "Linux desktop",
};

const meta = "fact";

/** A role line is "Author · GPLv3": keep each dot with the words before it, so a wrap never starts a line with one. */
function glueDots(text: string) {
  return text.split(" · ").join("\u00a0· ");
}

function Links({ project }: { project: ProjectData }) {
  const links = [
    project.links.gitlab && { href: project.links.gitlab, text: "Source on GitLab", external: true },
    project.links.github && { href: project.links.github, text: "Source on GitHub", external: true },
    project.links.page && { href: project.links.page, text: project.links.pageLabel ?? "See it", external: false },
  ].filter((l): l is { href: string; text: string; external: boolean } => Boolean(l));
  if (links.length === 0) return <p className={meta}>Private repository</p>;
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1">
      {links.map((l) =>
        l.external ? (
          <a key={l.href} href={l.href} className="link inline-block py-2.5 -my-2.5" target="_blank" rel="noopener noreferrer" aria-label={`${project.title}: ${l.text}`}>
            {l.text}
          </a>
        ) : (
          <Link key={l.href} href={l.href} className="link inline-block py-2.5 -my-2.5">
            {l.text}
          </Link>
        ),
      )}
    </p>
  );
}

/**
 * "Last commit 3 days ago · CI passed · v1.4.0 · 0 stars · as of 11 Nov 2026", fetched from GitLab
 * once, when the site was built (tools/liveness.mjs), never in the browser. Only the CI word takes a
 * colour, and only because it is a measured state. Rows without a GitLab link have no line.
 */
function Liveness({ project }: { project: ProjectData }) {
  if (!project.links.gitlab) return null;
  const line = livenessLine(livenessFor(project.slug, generated as Generated, null, BUILD_DATE));
  // A wrap never starts a line with a dot, and a count stays with its noun.
  const glued = glueDots(lineText(line));
  const text = line.stars ? glued.replace(line.stars, line.stars.replace(" ", "\u00a0")) : glued;
  const tone = line.tone === "ok" ? "text-ok" : line.tone === "bad" ? "text-warn" : "";
  // The CI word takes its colour; the date never breaks across lines. Everything else is plain text.
  const marks = [
    line.ci && { at: text.indexOf(line.ci), len: line.ci.length, cls: `${tone} font-semibold` },
    line.asOf && { at: text.indexOf(line.asOf), len: line.asOf.length, cls: "whitespace-nowrap" },
  ]
    .filter((m): m is { at: number; len: number; cls: string } => Boolean(m) && (m as { at: number }).at >= 0)
    .sort((x, y) => x.at - y.at);
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const m of marks) {
    nodes.push(text.slice(pos, m.at), <span key={m.at} className={m.cls}>{text.slice(m.at, m.at + m.len)}</span>);
    pos = m.at + m.len;
  }
  nodes.push(text.slice(pos));
  return (
    <p className={meta} data-liveness={project.slug} data-source={line.snapshot ? "snapshot" : "api"}>
      {nodes}
    </p>
  );
}

function Metric({ project, size }: { project: ProjectData; size: string }) {
  return (
    <div>
      <p className={`wd-narrow font-black leading-[0.95] ${size}`}>{project.metric.value}</p>
      <p className="mt-2 text-[0.95rem] text-fg/80 leading-snug">{project.metric.label}</p>
    </div>
  );
}

function Featured({ project }: { project: ProjectData }) {
  return (
    <article id={projectAnchor(project.slug)} className="landing border-t border-border py-8 grid lg:grid-cols-12 gap-x-8 gap-y-5">
      <header className="lg:col-span-3">
        <h3 className="wd-semi text-3xl font-extrabold leading-none">{project.title}</h3>
        <p className={`${meta} mt-2`}>{CATEGORY_LABEL[project.category]}</p>
        <p className={meta}>{glueDots(project.role)}</p>
      </header>
      <div className="lg:col-span-6 space-y-3">
        <p className="text-lg leading-snug">{project.description}</p>
        <p className="text-fg/80 max-w-[64ch]">{project.why}</p>
        <p className={meta}>{project.tech.join(", ")}</p>
        <Liveness project={project} />
        <Links project={project} />
      </div>
      <div className="lg:col-span-3 lg:border-l lg:border-border lg:pl-8">
        <Metric project={project} size={project.metric.value.length > 9 ? "text-4xl" : "text-5xl"} />
      </div>
      {FIGURES[project.slug] ? <div className="lg:col-span-9 lg:col-start-4 mt-2">{FIGURES[project.slug]}</div> : null}
    </article>
  );
}

function Compact({ project }: { project: ProjectData }) {
  return (
    <article id={projectAnchor(project.slug)} className="landing border-t border-border py-6 flex flex-col gap-2.5">
      <header>
        <h3 className="wd-semi text-xl font-bold leading-tight">{project.title}</h3>
        <p className={meta}>
          {CATEGORY_LABEL[project.category]}. {glueDots(project.role)}
        </p>
      </header>
      <p className="leading-snug">{project.description}</p>
      <p className="text-[0.95rem]">
        <span className="wd-narrow font-black text-lg mr-1.5">{project.metric.value}</span>
        <span className="text-fg/80">{project.metric.label}</span>
      </p>
      <div className="mt-auto space-y-1">
        <Liveness project={project} />
        <Fold summary="Why it is interesting">
          <p className="text-[0.95rem] text-fg/80">{project.why}</p>
          <p className={`${meta} mt-2`}>{project.tech.join(", ")}</p>
        </Fold>
        <Links project={project} />
      </div>
    </article>
  );
}

export default function Projects() {
  const items = projects.map((p) => ({
    slug: p.slug,
    category: p.category,
    featured: p.featured,
    node: p.featured ? <Featured project={p} /> : <Compact project={p} />,
  }));
  const cats = categories(projects).map((c) => ({ ...c, label: CATEGORY_LABEL[c.id] }));
  return (
    <Section
      id="projects"
      title="Outside work I take apart things that were not meant to be opened."
      lede={
        <>
          <p>A TV&apos;s video plane, a keyboard&apos;s stock firmware, a phone&apos;s hinge sensor.</p>
          <p>
            The recent ones are built by directing AI coding agents; I do the design and the verification. The{" "}
            <Link href="/notes/colophon/" className="link">
              colophon
            </Link>{" "}
            says exactly which is which.
          </p>
        </>
      }
    >
      <ProjectFilter categories={cats} items={items} featuredClass="border-b border-border" restClass="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-x-8" />
    </Section>
  );
}
