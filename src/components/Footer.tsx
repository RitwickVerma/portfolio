export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p>
          Built with Next.js, served from a homelab. &copy; {new Date().getFullYear()} Ritwick
          Verma.
        </p>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/RitwickVerma"
            className="hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://gitlab.com/ritwick7"
            className="hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitLab
          </a>
          <a
            href="https://buycovfefefor.ritwickverma.dev"
            className="hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support
          </a>
          <a
            href="https://linkedin.com/in/ritwickverma"
            className="hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="mailto:verma1997@gmail.com"
            className="hover:text-accent transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
