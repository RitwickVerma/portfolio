import { experiences, socialLinks } from "@/lib/data";

// The ask. Everything a recruiter or hiring manager needs in one place: how
// to reach me, where I am, the PDF. No form, no third party; a mailto opens
// their own client with the subject filled in.

const EMAIL_SUBJECT = encodeURIComponent("Hello from ritwickverma.dev");

const profiles = [
  { label: "LinkedIn", text: "in/ritwick-verma", href: socialLinks.linkedin },
  { label: "GitLab", text: "ritwick7", href: socialLinks.gitlab },
  { label: "GitHub", text: "RitwickVerma", href: socialLinks.github },
];

export default function Contact() {
  const location = experiences[0].location;
  return (
    <section id="contact" aria-labelledby="contact-title" className="landing border-t-2 border-fg">
      <div className="max-w-[var(--page)] mx-auto px-5 sm:px-8 pt-8 pb-20 sm:pb-28">
        <h2 id="contact-title" className="wd-semi text-h2 font-extrabold leading-[1.02] max-w-[18ch]">
          Email is the fastest way to reach me.
        </h2>
        <p className="mt-10">
          <a
            href={`mailto:${socialLinks.email}?subject=${EMAIL_SUBJECT}`}
            className="inline-block py-2 wd-narrow font-black text-[clamp(1.9rem,7.4vw,6rem)] leading-none text-accent underline decoration-[0.06em] underline-offset-[0.14em] decoration-accent/35 hover:decoration-accent break-all"
          >
            {socialLinks.email}
          </a>
        </p>
        <div className="mt-10 grid lg:grid-cols-12 gap-x-8 gap-y-6">
          <p className="lg:col-span-5 text-fg/85 max-w-[52ch]">
            {location ? `Based in ${location}. ` : ""}I read everything that comes in. The resume is one page; the notes
            are the long version.
          </p>
          <ul className="lg:col-span-4">
            {profiles.map((p) => (
              <li key={p.label} className="grid grid-cols-[5rem_1fr] items-center">
                <span className="wd-narrow text-muted">{p.label}</span>
                <a href={p.href} target="_blank" rel="noopener noreferrer" className="link justify-self-start inline-flex items-center min-h-11">
                  {p.text}
                </a>
              </li>
            ))}
          </ul>
          <p className="lg:col-span-3">
            <a
              href="/Ritwick_Verma_Resume.pdf"
              download
              className="btn min-h-11"
            >
              Download the resume (PDF)
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
