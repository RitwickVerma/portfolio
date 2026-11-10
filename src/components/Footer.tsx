import Link from "next/link";
import { socialLinks } from "@/lib/data";

const links = [
  { label: "Engine room", href: "/engine/", external: false },
  { label: "Design language", href: "/design/", external: false },
  { label: "Notes", href: "/notes/", external: false },
  { label: "Resume", href: socialLinks.resume, external: false },
  { label: "GitHub", href: socialLinks.github, external: true },
  { label: "GitLab", href: socialLinks.gitlab, external: true },
  { label: "LinkedIn", href: socialLinks.linkedin, external: true },
  { label: "Buy me a covfefe", href: socialLinks.support, external: true },
];

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-[var(--page)] mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 text-sm text-muted">
        <p className="py-1">
          &copy; {new Date().getFullYear()} Ritwick Verma.{" "}
          <Link href="/notes/colophon/" className="inline-block py-3 -my-3 underline decoration-fg/30 underline-offset-4 hover:text-fg">
            How this site is built
          </Link>
        </p>
        <ul className="flex flex-wrap gap-x-5">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="inline-flex items-center justify-center min-h-11 min-w-11 hover:text-fg hover:underline underline-offset-4"
                {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
