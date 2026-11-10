import Link from "next/link";
import { socialLinks } from "@/lib/data";
import PaletteButton from "@/components/PaletteButton";
import ThemeToggle from "@/components/ThemeToggle";

// One row, no menu button. The in-page links drop out on a phone, where the
// page is a single scroll and the palette reaches everything. Search, theme
// and Email always stay; Resume yields below 360 px and is in the palette.
const links = [
  { href: "/#work", label: "Work", always: false },
  { href: "/#projects", label: "Projects", always: false },
  { href: "/notes/", label: "Notes", always: false },
  { href: socialLinks.resume, label: "Resume", always: true },
];

const item = "px-2 lg:px-2.5 py-2 text-[0.95rem] text-fg/80 hover:text-fg underline-offset-[6px] decoration-1 hover:underline whitespace-nowrap";

export default function Nav() {
  return (
    <nav aria-label="Primary" className="sticky top-0 z-50 bg-background/92 backdrop-blur-sm border-b border-border">
      <div className="max-w-[var(--page)] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="wd-semi font-extrabold text-[1.05rem] tracking-tight py-2 hover:text-accent whitespace-nowrap">
          Ritwick Verma
        </Link>
        <ul className="flex items-center">
          {links.map((l) => (
            <li key={l.href} className={l.always ? "max-[359px]:hidden" : "hidden md:block"}>
              <Link href={l.href} className={item}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="sm:ml-1">
            <PaletteButton />
          </li>
          <li>
            <ThemeToggle />
          </li>
          <li className="ml-1 sm:ml-2">
            <a
              href={`mailto:${socialLinks.email}?subject=${encodeURIComponent("Hello from ritwickverma.dev")}`}
              className="btn !py-1.5 !px-3"
            >
              <span>
                Email<span className="max-sm:sr-only"> me</span>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
