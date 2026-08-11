"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { projects } from "@/lib/data";

function TiltCard({ project }: { project: (typeof projects)[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const handleMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: -y * 8, y: x * 8 });
    setGlow({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative perspective-[800px] group"
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="glass glow-border rounded-xl p-6 flex flex-col gap-3 relative overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Glow spot */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(100,255,218,0.08) 0%, transparent 60%)`,
          }}
        />

        <div className="flex items-center gap-2 relative z-10">
          <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
            {project.category}
          </span>
          {project.featured && (
            <span className="text-[10px] font-mono text-accent/70 border border-accent/20 rounded-full px-2 py-px">
              Featured
            </span>
          )}
        </div>

        <h3 className="text-fg font-semibold text-lg relative z-10">
          {project.title}
        </h3>

        <p className="text-fg/60 text-sm leading-relaxed flex-1 relative z-10">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 relative z-10">
          {project.tech.map((t) => (
            <span
              key={t}
              className="text-[11px] font-mono text-muted bg-white/[0.03] rounded px-1.5 py-px"
            >
              {t}
            </span>
          ))}
        </div>

        {project.links.github && (
          <a
            href={project.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent/70 text-sm hover:text-accent transition-colors inline-flex items-center gap-1 mt-1 relative z-10"
          >
            GitHub →
          </a>
        )}
      </motion.div>
    </div>
  );
}

export default function ProjectsSection() {
  return (
    <section id="projects" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="font-mono text-accent text-sm mb-6 tracking-widest uppercase"
      >
        Projects
      </motion.h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p, i) => (
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <TiltCard project={p} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
