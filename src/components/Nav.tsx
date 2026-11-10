import Link from "next/link";
import { socialLinks } from "@/lib/data";
import PaletteButton from "@/components/PaletteButton";
import ThemeToggle from "@/components/ThemeToggle";

// One row, no menu button. The in-page links drop out on a phone, where the
// page is a single scroll and the palette reaches everything. Search, theme
// and Email always stay; Resume yields below 420 px (it needs 420 with the 44 px
// icon targets; at 360 to 389 it pushed Email past the edge) and is in the footer,
// the contact section and the palette. Icon targets are 44 px from 360 px up; at
// 320 there is only room for 34.
const links = [
  { href: "/#work", label: "Work", always: false },
  { href: "/#projects", label: "Projects", always: false },
  { href: "/notes/", label: "Notes", always: false },
  { href: socialLinks.resume, label: "Resume", always: true },
];

const item = "inline-flex items-center min-h-11 px-2 lg:px-2.5 text-[0.95rem] text-fg/80 hover:text-fg underline-offset-[6px] decoration-1 hover:underline whitespace-nowrap";

export default function Nav() {
  return (
    <nav aria-label="Primary" className="sticky top-0 z-50 bg-background/92 backdrop-blur-sm border-b border-border">
      <div className="max-w-[var(--page)] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="wd-semi font-extrabold text-[1.05rem] tracking-tight inline-flex items-center min-h-11 hover:text-accent whitespace-nowrap">
          Ritwick Verma
        </Link>
        <ul className="flex items-center">
          {links.map((l) => (
            <li key={l.href} className={l.always ? "max-[419px]:hidden" : "hidden md:block"}>
              <Link href={l.href} className={item}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="sm:ml-1 min-[360px]:[&>button]:min-h-11 min-[360px]:[&>button]:min-w-11 min-[360px]:[&>button]:justify-center">
            <PaletteButton />
          </li>
          <li>
            <ThemeToggle />
          </li>
          <li className="ml-1 sm:ml-2">
            <a
              href={`mailto:${socialLinks.email}?subject=${encodeURIComponent("Hello from ritwickverma.dev")}`}
              className="btn !py-1.5 !px-3 min-h-11"
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
