import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ClientShell from "@/components/ClientShell";
import Backdrop from "@/components/Backdrop";
import { PointerProvider } from "@/components/PointerProvider";

// The site shell: backdrop shader, nav, footer. /resume deliberately sits
// outside this group so it prints as a plain document.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PointerProvider>
      <Backdrop />
      <ClientShell>
        <Nav />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </ClientShell>
    </PointerProvider>
  );
}
