import Link from "next/link";
import { projects } from "@/lib/data";
import { projectAnchor } from "@/lib/corpus";
import Section from "@/components/Section";

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

const meta = "wd-narrow text-[0.95rem] text-muted";

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
          <a key={l.href} href={l.href} className="link py-2 -my-2" target="_blank" rel="noopener noreferrer" aria-label={`${project.title}: ${l.text}`}>
            {l.text}
          </a>
        ) : (
          <Link key={l.href} href={l.href} className="link py-2 -my-2">
            {l.text}
          </Link>
        ),
      )}
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
        <p className={meta}>{project.role}</p>
      </header>
      <div className="lg:col-span-6 space-y-3">
        <p className="text-lg leading-snug">{project.description}</p>
        <p className="text-fg/80 max-w-[64ch]">{project.why}</p>
        <p className={meta}>{project.tech.join(", ")}</p>
        <Links project={project} />
      </div>
      <div className="lg:col-span-3 lg:border-l lg:border-border lg:pl-8">
        <Metric project={project} size={project.metric.value.length > 9 ? "text-4xl" : "text-5xl"} />
      </div>
    </article>
  );
}

function Compact({ project }: { project: ProjectData }) {
  return (
    <article id={projectAnchor(project.slug)} className="landing border-t border-border py-6 flex flex-col gap-2.5">
      <header>
        <h3 className="wd-semi text-xl font-bold leading-tight">{project.title}</h3>
        <p className={meta}>
          {CATEGORY_LABEL[project.category]}. {project.role}
        </p>
      </header>
      <p className="leading-snug">{project.description}</p>
      <p className="text-[0.95rem] text-fg/80">{project.why}</p>
      <p className="text-[0.95rem]">
        <span className="wd-narrow font-black text-lg mr-1.5">{project.metric.value}</span>
        <span className="text-fg/80">{project.metric.label}</span>
      </p>
      <div className="mt-auto pt-1 space-y-1.5">
        <p className={meta}>{project.tech.join(", ")}</p>
        <Links project={project} />
      </div>
    </article>
  );
}

export default function Projects() {
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);
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
      <div className="border-b border-border">
        {featured.map((p) => (
          <Featured key={p.slug} project={p} />
        ))}
      </div>
      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-x-8">
        {rest.map((p) => (
          <Compact key={p.slug} project={p} />
        ))}
      </div>
    </Section>
  );
}
