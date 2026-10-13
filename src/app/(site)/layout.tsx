import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ClientShell from "@/components/ClientShell";
import Backdrop from "@/components/Backdrop";
import CursorGlow from "@/components/CursorGlow";
import { PointerProvider } from "@/components/PointerProvider";

// Everything that makes the home page "the experience": backdrop shader,
// cursor trail, nav, footer. /resume deliberately sits outside this group.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PointerProvider>
      <Backdrop />
      <CursorGlow />
      <ClientShell>
        <Nav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </ClientShell>
    </PointerProvider>
  );
}
