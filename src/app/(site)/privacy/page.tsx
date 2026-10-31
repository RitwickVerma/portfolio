import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy policy for this site and for hermes-agent, a personal tool.",
  alternates: { canonical: "/privacy/" },
  robots: { index: false, follow: false },
};

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 sm:pb-32 text-fg/80 leading-relaxed space-y-5">
      <h1 className="font-mono text-muted text-sm tracking-widest uppercase mb-3">Privacy</h1>
      <p>
        This site does not use cookies, analytics or trackers, and it does not collect personal
        data from visitors.
      </p>
      <p>
        hermes-agent is a personal tool I run on my own server. Its Google sign-in is used only by
        me, to read and organize my own email and to update a spreadsheet I own. It is not offered
        to anyone else. Data it reads from my Google account stays on my server and is never sold,
        shared or used for advertising.
      </p>
      <p>Questions: verma1997@gmail.com</p>
      <p className="text-sm text-muted">Last updated October 30, 2026.</p>
    </div>
  );
}
