"use client";

import { motion } from "framer-motion";
import { skills } from "@/lib/data";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutSection() {
  return (
    <section id="about" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="font-mono text-accent text-sm mb-6 tracking-widest uppercase"
      >
        About
      </motion.h2>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Bio */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-4"
        >
          <motion.p variants={fadeUp} className="text-fg/80 leading-relaxed">
            I&apos;m a software engineer at{" "}
            <span className="text-accent">eBay</span> in San Francisco, where I
            build backend services at scale. I earned my MCS from{" "}
            <span className="text-accent">UC Irvine</span> and my BTech in CS
            from SRM Institute.
          </motion.p>
          <motion.p variants={fadeUp} className="text-fg/80 leading-relaxed">
            I thrive at the intersection of systems and software — I&apos;ve
            built everything from a custom C++ game engine to a production
            quantitative trading bot. My Android app{" "}
            <span className="text-accent">ShutUp</span> has over 26,000
            downloads on the Play Store.
          </motion.p>
          <motion.p variants={fadeUp} className="text-fg/80 leading-relaxed">
            Outside of work, I run a{" "}
            <span className="text-accent">15-service homelab</span> on Proxmox
            with a Debian gateway, self-host everything from my password manager
            to my photo library, and obsess over infrastructure automation.
          </motion.p>
        </motion.div>

        {/* Skills */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
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
              <div className="flex flex-wrap gap-2">
                {group.items.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-full text-xs glass border-white/[0.08] text-fg/70 hover:text-accent hover:border-accent/20 transition-colors"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Timeline */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="mt-16"
      >
        <motion.h3
          variants={fadeUp}
          className="text-sm font-mono text-muted mb-8 tracking-widest uppercase"
        >
          Experience
        </motion.h3>
        <div className="space-y-0">
          {[
            {
              company: "eBay",
              role: "Software Engineer",
              period: "2021 — Present",
              desc: "Backend services at scale for one of the world's largest e-commerce platforms.",
            },
            {
              company: "Shoelace Wireless",
              role: "Software Dev Intern",
              period: "2020",
              desc: "Radio metrics tool + MapBox crowd density visualization app.",
            },
            {
              company: "Advanced Structures India",
              role: "Software Dev Intern",
              period: "2018",
              desc: "SQL data extraction from Django models for internal documentation.",
            },
            {
              company: "Bharat Heavy Electricals Ltd",
              role: "Software Dev Intern",
              period: "2017",
              desc: "Library management system in Java EE — 2ms response times.",
            },
          ].map((exp, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="relative pl-8 pb-8 border-l border-white/[0.08] last:pb-0"
            >
              <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-accent/60" />
              <div className="space-y-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-fg font-medium">{exp.role}</span>
                  <span className="text-accent text-sm font-mono">
                    @{exp.company}
                  </span>
                  <span className="text-muted text-xs">{exp.period}</span>
                </div>
                <p className="text-fg/60 text-sm">{exp.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          variants={fadeUp}
          className="relative pl-8 border-l border-white/[0.08]"
        >
          <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-accent/30" />
          <div className="space-y-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-fg font-medium">MCS Computer Science</span>
              <span className="text-accent text-sm font-mono">@UC Irvine</span>
              <span className="text-muted text-xs">2019 — 2020</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
