import TitleBlock from "@/components/TitleBlock";
import Colophon from "@/components/Colophon";
import RevealObserver from "@/components/RevealObserver";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TitleBlock />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
        {children}
      </main>
      <Colophon />
      <RevealObserver />
    </>
  );
}
