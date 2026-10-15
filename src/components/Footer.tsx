import Link from "next/link";
import { socialLinks } from "@/lib/data";

const links = [
  { label: "Notes", href: "/notes/", external: false },
  { label: "Resume", href: socialLinks.resume, external: false },
  { label: "GitHub", href: socialLinks.github, external: true },
  { label: "GitLab", href: socialLinks.gitlab, external: true },
  { label: "LinkedIn", href: socialLinks.linkedin, external: true },
  { label: "Email", href: `mailto:${socialLinks.email}`, external: false },
  { label: "Buy me a covfefe", href: socialLinks.support, external: true },
];

export default function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p className="text-center sm:text-left">
          &copy; {new Date().getFullYear()} Ritwick Verma ·{" "}
          <Link href="/notes/colophon/" className="hover:text-accent transition-colors">
            Colophon
          </Link>
        </p>
        <ul className="flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-2">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="inline-block py-3 -my-3 hover:text-accent transition-colors"
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
