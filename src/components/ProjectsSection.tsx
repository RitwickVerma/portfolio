import Link from "next/link";
import { projects } from "@/lib/data";

export default function ProjectsSection() {
  return (
    <section id="projects" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        Projects
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div
            key={p.slug}
            className="glass glow-border rounded-xl p-6 flex flex-col gap-3 group transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                {p.category}
              </span>
              {p.featured && (
                <span className="text-[10px] font-mono text-accent/70 border border-accent/20 rounded-full px-2 py-px">
                  Featured
                </span>
              )}
            </div>
            <h3 className="text-fg font-semibold text-lg">{p.title}</h3>
            <p className="text-fg/60 text-sm leading-relaxed flex-1">
              {p.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.tech.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-mono text-muted bg-white/[0.03] rounded px-1.5 py-px"
                >
                  {t}
                </span>
              ))}
            </div>
            {p.links.github && (
              <a
                href={p.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent/70 text-sm hover:text-accent transition-colors inline-flex items-center gap-1 mt-1"
              >
                GitHub →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
