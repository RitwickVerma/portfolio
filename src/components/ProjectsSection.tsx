"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { projects } from "@/lib/data";
import { SPRING, DURATION, EASE } from "@/lib/motion";
import { usePointer } from "./PointerProvider";

type ProjectData = (typeof projects)[number];

function TiltCard({ project }: { project: ProjectData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const updateFromPointer = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = pointer.current.x * window.innerWidth;
    const cy = (1 - pointer.current.y) * window.innerHeight;
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return;
    const x = ((cx - rect.left) / rect.width - 0.5) * 2;
    const y = ((cy - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: -y * 6, y: x * 6 });
    setGlow({
      x: ((cx - rect.left) / rect.width) * 100,
      y: ((cy - rect.top) / rect.height) * 100,
    });
  }, [pointer]);

  const handleLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
  };

  // Poll pointer position only while the card is hovered
  const rafRef = useRef(0);
  const pollPointer = useRef(updateFromPointer);

  useEffect(() => {
    pollPointer.current = updateFromPointer;
  });

  const handleEnter = () => {
    const loop = () => {
      pollPointer.current();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const handleExit = () => {
    cancelAnimationFrame(rafRef.current);
    handleLeave();
  };

  const links = [
    project.links.github && { href: project.links.github, label: "GitHub" },
    project.links.gitlab && { href: project.links.gitlab, label: "GitLab" },
  ].filter((l): l is { href: string; label: string } => Boolean(l));

  return (
    <div
      ref={cardRef}
      onPointerEnter={handleEnter}
      onPointerLeave={handleExit}
      className="relative perspective-[800px] group h-full"
    >
      <motion.article
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={SPRING.soft}
        className="glass glow-border rounded-xl p-6 flex flex-col gap-3 relative overflow-hidden h-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Glow spot */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(100,255,218,0.08) 0%, transparent 60%)`,
          }}
        />

        <header className="relative z-10 flex items-baseline justify-between gap-3">
          <h3 className="text-fg font-semibold text-lg">{project.title}</h3>
          <span className="text-xs font-mono text-muted uppercase tracking-wider shrink-0">
            {project.category}
          </span>
        </header>

        <p className="relative z-10 text-xs font-mono text-muted">{project.role}</p>

        <div className="relative z-10 border-l-2 border-accent/50 pl-3">
          <p className="font-mono text-accent text-xl leading-tight">
            {project.metric.value}
          </p>
          <p className="text-xs text-fg/70">{project.metric.label}</p>
        </div>

        <p className="relative z-10 text-fg/80 text-sm leading-relaxed">
          {project.description}
        </p>
        <p className="relative z-10 text-fg/70 text-sm leading-relaxed flex-1">
          <span className="text-muted">Why it&apos;s interesting — </span>
          {project.why}
        </p>

        <ul className="relative z-10 flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <li
              key={t}
              className="text-xs font-mono text-muted bg-white/[0.03] rounded px-1.5 py-px"
            >
              {t}
            </li>
          ))}
        </ul>

        {links.length > 0 && (
          <div className="relative z-10 flex flex-wrap gap-4 mt-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent text-sm hover:underline underline-offset-4 inline-flex items-center gap-1"
              >
                {l.label} →<span className="sr-only"> — {project.title}</span>
              </a>
            ))}
          </div>
        )}
      </motion.article>
    </div>
  );
}

function Grid({ items, className }: { items: ProjectData[]; className: string }) {
  return (
    <div className={`grid gap-4 ${className}`}>
      {items.map((p, i) => (
        <motion.div
          key={p.slug}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: i * 0.08, duration: DURATION.base, ease: EASE.outExpo }}
        >
          <TiltCard project={p} />
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
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: DURATION.base, ease: EASE.outExpo }}
        className="font-mono text-accent text-sm mb-6 tracking-widest uppercase"
      >
        Projects
      </motion.h2>

      <div className="space-y-4">
        <Grid items={featured} className="md:grid-cols-2" />
        <Grid items={rest} className="md:grid-cols-3" />
      </div>
    </section>
  );
}
