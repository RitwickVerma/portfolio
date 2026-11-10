import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

// The site shell: nav and footer. /resume and the app pages deliberately sit
// outside this group so they render as their own documents.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
