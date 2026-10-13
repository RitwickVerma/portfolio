import { socialLinks } from "@/lib/data";

/** Footer: contact, and a build receipt read from this exact build. */
export default function Colophon() {
  const sha = process.env.BUILD_SHA;
  return (
    <footer id="contact" className="colophon frame">
      <div className="colophon-grid">
        <div>
          <p className="label label-signal" style={{ marginBottom: 14 }}>
            Contact
          </p>
          <p className="big">
            Hiring for backend or infrastructure work?{" "}
            <a className="link serif-em" href={`mailto:${socialLinks.email}`}>
              Write to me.
            </a>
          </p>
          <ul className="mono" style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: "8px 22px", fontSize: 13 }}>
            <li><a className="link" href={`mailto:${socialLinks.email}`}>{socialLinks.email}</a></li>
            <li><a className="link" href={socialLinks.linkedin}>LinkedIn</a></li>
            <li><a className="link" href={socialLinks.github}>GitHub</a></li>
            <li><a className="link" href={socialLinks.gitlab}>GitLab</a></li>
            <li><a className="link" href="/resume/">Resume</a></li>
          </ul>
        </div>

        <div>
          <p className="label" style={{ marginBottom: 14 }}>Build receipt</p>
          <dl>
            <dt>Commit</dt>
            <dd>{sha}</dd>
            <dt>Built</dt>
            <dd>{process.env.BUILD_DATE}</dd>
            <dt>Runtime deps</dt>
            <dd>{process.env.BUILD_DEPS}</dd>
            <dt>Trackers</dt>
            <dd>none — no cookies, no analytics</dd>
          </dl>
        </div>

        <div>
          <p className="label" style={{ marginBottom: 14 }}>Colophon</p>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Set in Fraunces, IBM Plex Sans and IBM Plex Mono. Static HTML, served by nginx from CT114 on the
            Proxmox host drawn on the index page. The drawings are generated from the same data as the text.
          </p>
          <p className="muted mono" style={{ fontSize: 12, marginTop: 14 }}>
            © {new Date().getFullYear()} Ritwick Verma ·{" "}
            <a className="link" href={socialLinks.support}>support my open-source work</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
