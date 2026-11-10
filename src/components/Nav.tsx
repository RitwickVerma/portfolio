import Link from "next/link";
import { socialLinks } from "@/lib/data";

// One row, no menu button: the in-page links drop out on a phone, where the
// page is a single scroll anyway. Resume and Email always stay; Notes yields
// on the narrowest screens and is still in the footer.
const inPage = [
  { href: "/#work", label: "Work" },
  { href: "/#projects", label: "Projects" },
];

const item = "px-2 sm:px-2.5 py-2 text-[0.95rem] text-fg/80 hover:text-fg underline-offset-[6px] decoration-1 hover:underline";

export default function Nav() {
  return (
    <nav aria-label="Primary" className="sticky top-0 z-50 bg-background/92 backdrop-blur-sm border-b border-border">
      <div className="max-w-[78rem] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="wd-semi font-extrabold text-[1.05rem] tracking-tight py-2 hover:text-accent whitespace-nowrap">
          Ritwick Verma
        </Link>
        <ul className="flex items-center">
          {inPage.map((l) => (
            <li key={l.href} className="hidden sm:block">
              <Link href={l.href} className={item}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="hidden min-[380px]:block">
            <Link href="/notes/" className={item}>
              Notes
            </Link>
          </li>
          <li>
            <Link href={socialLinks.resume} className={item}>
              Resume
            </Link>
          </li>
          <li className="ml-1 sm:ml-2">
            <a
              href={`mailto:${socialLinks.email}?subject=${encodeURIComponent("Hello from ritwickverma.dev")}`}
              className="block px-3 sm:px-3.5 py-1.5 rounded-[4px] bg-fg text-background text-[0.95rem] font-medium hover:bg-accent transition-colors whitespace-nowrap"
            >
              Email<span className="max-sm:sr-only"> me</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
