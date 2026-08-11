import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import HomelabSection from "@/components/HomelabSection";
import HeroSceneWrapper from "@/components/HeroSceneWrapper";
import TerminalWrapper from "@/components/TerminalWrapper";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section
        id="hero"
        className="relative w-full h-[70vh] min-h-[500px] bg-grid overflow-hidden"
      >
        <HeroSceneWrapper />
        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-fg mb-4">
            Ritwick Verma
          </h1>
          <p className="text-muted text-base sm:text-lg font-mono">
            Software Engineer &bull; Homelab Architect &bull; Builder
          </p>
          <div className="flex gap-4 mt-8 pointer-events-auto">
            <a
              href="#projects"
              className="px-5 py-2 rounded-lg border border-accent/30 text-accent text-sm hover:bg-accent/10 transition-all"
            >
              View Projects
            </a>
            <a
              href="https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf"
              className="px-5 py-2 rounded-lg glass text-fg/80 text-sm hover:text-fg transition-all"
            >
              Resume ↓
            </a>
          </div>
        </div>
        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none z-10" />
      </section>

      <AboutSection />
      <ProjectsSection />
      <HomelabSection />
      <TerminalWrapper />
    </>
  );
}
