"use client";

import { useEffect, useRef, useState } from "react";
import { skills } from "@/lib/data";

export default function AboutSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={ref}
      className="max-w-6xl mx-auto px-6 py-24 sm:py-32"
    >
      <h2 className="font-mono text-accent text-sm mb-6 tracking-widest uppercase">
        About
      </h2>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Bio */}
        <div className="space-y-4">
          <p className="text-fg/80 leading-relaxed">
            I&apos;m a software engineer at{" "}
            <span className="text-accent">eBay</span> in San Francisco, where I
            build backend services at scale. I earned my MCS from{" "}
            <span className="text-accent">UC Irvine</span> and my BTech in CS
            from SRM Institute.
          </p>
          <p className="text-fg/80 leading-relaxed">
            I thrive at the intersection of systems and software — I&apos;ve
            built everything from a custom C++ game engine to a production
            quantitative trading bot. My Android app{" "}
            <span className="text-accent">ShutUp</span> has over 26,000
            downloads on the Play Store.
          </p>
          <p className="text-fg/80 leading-relaxed">
            Outside of work, I run a{" "}
            <span className="text-accent">14-service homelab</span> on Proxmox
            with a NixOS gateway, self-host everything from my password manager
            to my photo library, and obsess over infrastructure automation.
          </p>
        </div>

        {/* Skills */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-mono text-muted mb-3 tracking-widest uppercase">
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.languages.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs glass border-white/[0.08] text-fg/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-mono text-muted mb-3 tracking-widest uppercase">
              Domains
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.domains.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs glass border-white/[0.08] text-fg/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-mono text-muted mb-3 tracking-widest uppercase">
              Tools &amp; Platforms
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.tools.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs glass border-white/[0.08] text-fg/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-16">
        <h3 className="text-sm font-mono text-muted mb-8 tracking-widest uppercase">
          Experience
        </h3>
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
            <div
              key={i}
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
            </div>
          ))}
        </div>
        <div className="relative pl-8 border-l border-white/[0.08]">
          <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-accent/30" />
          <div className="space-y-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-fg font-medium">MCS Computer Science</span>
              <span className="text-accent text-sm font-mono">@UC Irvine</span>
              <span className="text-muted text-xs">2019 — 2020</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
