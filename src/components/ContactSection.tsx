import { experiences, socialLinks } from "@/lib/data";

// The ask. Everything a recruiter or hiring manager needs in one place:
// where I am, how to reach me, the PDF. No form, no third party; a mailto
// opens their own client with the subject filled in.

const EMAIL_SUBJECT = encodeURIComponent("Hello from ritwickverma.dev");

export default function ContactSection() {
  const location = experiences[0].location;
  return (
    <section id="contact" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <h2 className="font-mono text-muted text-sm mb-6 tracking-widest uppercase">Contact</h2>
      <div className="grid lg:grid-cols-[1fr_auto] gap-x-12 gap-y-8 items-start">
        <div className="max-w-2xl">
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg text-balance">
            Email is the fastest way to reach me.
          </p>
          <p className="mt-4 text-fg/80 leading-relaxed">
            {location ? `Based in ${location}. ` : ""}I read everything that comes in and reply
            within a day. The resume is one page; the notes above are the long version.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${socialLinks.email}?subject=${EMAIL_SUBJECT}`}
              className="px-6 py-3 rounded-lg bg-accent text-background text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Email me
            </a>
            <a
              href="/Ritwick_Verma_Resume.pdf"
              download
              className="px-6 py-3 rounded-lg border border-fg/60 text-fg text-sm hover:border-accent hover:text-accent transition-colors"
            >
              Resume (PDF)
            </a>
          </div>
        </div>
        <dl className="font-mono text-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 lg:pt-2">
          <dt className="text-muted">email</dt>
          <dd>
            <a href={`mailto:${socialLinks.email}`} className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              {socialLinks.email}
            </a>
          </dd>
          <dt className="text-muted">linkedin</dt>
          <dd>
            <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              in/ritwick-verma
            </a>
          </dd>
          <dt className="text-muted">github</dt>
          <dd>
            <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              RitwickVerma
            </a>
          </dd>
          <dt className="text-muted">gitlab</dt>
          <dd>
            <a href={socialLinks.gitlab} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              ritwick7
            </a>
          </dd>
        </dl>
      </div>
    </section>
  );
}
