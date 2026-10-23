"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { projects } from "@/lib/data";
import { DURATION, EASE } from "@/lib/motion";

type ProjectData = (typeof projects)[number];

const CATEGORY_LABEL: Record<ProjectData["category"], string> = {
  android: "Android",
  quant: "Quant",
  infra: "Infra",
  tv: "Smart TV",
  firmware: "Firmware",
  games: "Games",
  desktop: "KDE Plasma",
  security: "Security",
  foldable: "Galaxy Fold",
  linux: "Linux desktop",
};

function Card({ project }: { project: ProjectData }) {
  const links = [
    project.links.github && { href: project.links.github, text: `${project.title} on GitHub →`, external: true },
    project.links.gitlab && { href: project.links.gitlab, text: `${project.title} on GitLab →`, external: true },
    project.links.page && { href: project.links.page, text: `${project.links.pageLabel ?? "See it"} →`, external: false },
  ].filter((l): l is { href: string; text: string; external: boolean } => Boolean(l));

  return (
    <article className="glass glass-hover rounded-xl p-6 flex flex-col gap-3 h-full transition-colors">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-fg font-semibold text-lg">{project.title}</h3>
        <span className="text-xs font-mono text-fg/60 uppercase tracking-wider shrink-0">
          {CATEGORY_LABEL[project.category]}
        </span>
      </header>

      <p className="text-xs font-mono text-fg/60">{project.role}</p>

      <div className="border-l-2 border-accent/50 pl-3">
        <p className="font-mono text-accent text-xl leading-tight">{project.metric.value}</p>
        <p className="text-xs text-fg/70">{project.metric.label}</p>
      </div>

      <p className="text-fg/85 text-sm leading-relaxed">{project.description}</p>
      <p className="text-fg/65 text-sm leading-relaxed">{project.why}</p>

      {/* Pinned to the bottom so chips and links align across a row. */}
      <div className="mt-auto pt-3 flex flex-col gap-3">
        <ul className="flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <li
              key={t}
              className="text-xs font-mono text-fg/75 bg-surface border border-border rounded px-2 py-0.5"
            >
              {t}
            </li>
          ))}
        </ul>
        {/* Always rendered: cards without a public repo keep the row so chips line up. */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 min-h-5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-accent text-sm leading-5 py-3 -my-3 hover:underline underline-offset-4"
              {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {l.text}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

function Grid({ items, className }: { items: ProjectData[]; className: string }) {
  return (
    <div className={`grid gap-4 ${className}`}>
      {items.map((p, i) => (
        <motion.div
          key={p.slug}
          className="h-full"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: i * 0.06, duration: DURATION.base, ease: EASE.outExpo }}
        >
          <Card project={p} />
        </motion.div>
      ))}
    </div>
  );
}

export default function ProjectsSection() {
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="projects" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-muted text-sm mb-6 tracking-widest uppercase">Projects</h2>
      <p className="text-fg/75 text-sm leading-relaxed max-w-3xl mb-6">
        The recent ones are built by directing AI coding agents; I do the design and the verification. The{" "}
        <Link href="/notes/colophon/" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
          colophon
        </Link>{" "}
        has the details.
      </p>
      <div className="space-y-4">
        <Grid items={featured} className="md:grid-cols-2" />
        <Grid items={rest} className="md:grid-cols-2 lg:grid-cols-3" />
      </div>
    </section>
  );
}
