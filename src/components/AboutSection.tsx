"use client";

import { motion } from "framer-motion";
import { skills, experiences, education, services, projects } from "@/lib/data";
import { VARIANTS } from "@/lib/motion";

const { stagger, fadeUp } = VARIANTS;
const inView = { once: true, margin: "-50px" } as const;

// The bio quotes the ShutUp download count: read it from the project entry so
// one edit in lib/data updates the card, the resume and this paragraph.
const shutup = projects.find((p) => p.slug === "shutup");

export default function AboutSection() {
  return (
    <section id="about" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <motion.h2
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="font-mono text-muted text-sm mb-6 tracking-widest uppercase"
      >
        About
      </motion.h2>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Bio */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inView}
          className="space-y-4"
        >
          <motion.p variants={fadeUp} className="text-fg/80 leading-relaxed">
            I&apos;m a software engineer at{" "}
            <span className="text-accent">eBay</span> in San Francisco, on the
            Search Backend org&apos;s Query Search Stack team: Cassini, eBay&apos;s
            distributed C++ search engine. Since 2023 I own{" "}
            <span className="text-accent">fitment</span>, the subsystem that
            decides whether a listing fits the product a query names. MCS from{" "}
            <span className="text-accent">UC Irvine</span>, BTech in CS from SRM
            Institute.
          </motion.p>
          <motion.p variants={fadeUp} className="text-fg/80 leading-relaxed">
            Outside work I take apart things that were not meant to be opened:
            a TV&apos;s video plane, a keyboard&apos;s stock firmware, a
            phone&apos;s hinge sensor. <span className="text-accent">ShutUp</span>,
            an Android app I wrote in college, passed{" "}
            {shutup?.metric.value ?? "26,000+"} downloads.
          </motion.p>
          <motion.p variants={fadeUp} className="text-fg/80 leading-relaxed">
            I also run a small Proxmox lab, {services.length} guests declared in
            OpenTofu and diffed nightly by CI. It serves this site.
          </motion.p>
        </motion.div>

        {/* Skills */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inView}
          className="space-y-6"
        >
          {[
            { label: "Languages", items: skills.languages },
            { label: "Domains", items: skills.domains },
            { label: "Tools & Platforms", items: skills.tools },
          ].map((group) => (
            <motion.div key={group.label} variants={fadeUp}>
              <h3 className="text-sm font-mono text-muted mb-3 tracking-widest uppercase">
                {group.label}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((s) => (
                  <li
                    key={s}
                    className="px-3 py-1 rounded-full text-xs glass border-border text-fg/80"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Timeline */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        className="mt-16"
      >
        <motion.h3
          variants={fadeUp}
          className="text-sm font-mono text-muted mb-8 tracking-widest uppercase"
        >
          Experience
        </motion.h3>
        <ol className="space-y-0">
          {experiences.map((exp) => (
            <motion.li
              key={`${exp.company} ${exp.period}`}
              variants={fadeUp}
              className="relative pl-8 pb-8 border-l border-border"
            >
              <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-accent/60" />
              <div className="space-y-1">
                <div className="flex items-baseline gap-x-3 flex-wrap">
                  <span className="text-fg font-medium">{exp.role}</span>
                  <span className="text-accent text-sm font-mono">
                    @{exp.company}
                  </span>
                  <span className="text-muted text-xs">{exp.period}</span>
                </div>
                {exp.description.map((d) => (
                  <p key={d} className="text-fg/70 text-sm">
                    {d}
                  </p>
                ))}
              </div>
            </motion.li>
          ))}
          {education.map((ed, i) => (
            <motion.li
              key={ed.school}
              variants={fadeUp}
              className={`relative pl-8 border-l border-border ${
                i < education.length - 1 ? "pb-6" : ""
              }`}
            >
              <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-accent/30" />
              <div className="flex items-baseline gap-x-3 flex-wrap">
                <span className="text-fg font-medium">{ed.degree}</span>
                <span className="text-accent text-sm font-mono">@{ed.school}</span>
                <span className="text-muted text-xs">{ed.period}</span>
              </div>
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </section>
  );
}
