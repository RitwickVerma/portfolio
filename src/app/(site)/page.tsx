import Search from "@/components/Search";
import Work from "@/components/Work";
import Projects from "@/components/Projects";
import Keyboard from "@/components/Keyboard";
import Notes from "@/components/Notes";
import Homelab from "@/components/Homelab";
import Contact from "@/components/Contact";
import { hero } from "@/lib/data";

export default function Home() {
  return (
    <>
      <header className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-16 sm:pb-24">
        <h1 className="wd-wide text-display font-black leading-[0.86] -ml-[0.04em]">{hero.name}</h1>
        <p className="mt-5 sm:mt-7 text-lede leading-[1.25] max-w-[46ch]">
          <span className="font-semibold">{hero.line}</span> <span className="text-fg/75">{hero.lineTwo}</span>
        </p>
        <div className="mt-8 sm:mt-10">
          <Search />
        </div>
      </header>
      <Work />
      <Projects />
      <Keyboard />
      <Notes />
      <Homelab />
      <Contact />
    </>
  );
}
