import { Fold } from "./kit";
import { siteUrl, sourceFor, upstreamUrl } from "@/lib/sources";

// "Source" under a figure: the module on this site that the figure runs, and the file, symbol and
// pinned commit upstream that it was ported from. Both are links to GitLab (a place to go, so blue);
// the table is lib/sources.ts. A <details>, so the links are in the server HTML and it opens without
// JavaScript. An unknown figure id throws at build rather than printing nothing.

/** A path with a place to break after every slash, so a narrow screen splits it between folders, not in the middle of a name. */
function Path({ text }: { text: string }) {
  const parts = text.split("/");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <>/<wbr /></> : null}
        </span>
      ))}
    </>
  );
}

export function Sources({ figure }: { figure: string }) {
  const s = sourceFor(figure);
  if (!s) throw new Error(`Sources: no entry for figure "${figure}" in lib/sources.ts`);
  const u = s.upstream;
  const code = "font-mono text-[0.85em] [overflow-wrap:break-word]";
  return (
    <div className="-mt-6 mb-8" data-sources={figure}>
      <Fold summary="Source">
        <ul className="fact space-y-1.5 max-w-[68ch]">
          <li>
            On this site:{" "}
            <a href={siteUrl(s.site.file)} className={`link ${code}`} target="_blank" rel="noopener noreferrer">
              <Path text={s.site.file} />
            </a>{" "}
            {"·\u00a0"}<span className={code}>{s.site.symbol}</span>
          </li>
          <li>
            {u.repo === null ? (
              <>
                Upstream: none; {u.note}.
              </>
            ) : (
              <>
                Upstream ({s.relation}):{" "}
                <a href={upstreamUrl(u)} className={`link ${code}`} target="_blank" rel="noopener noreferrer">
                  <Path text={`${u.repo}/${u.path}`} />
                </a>{" "}
                {"·\u00a0"}<span className={code}>{u.symbol}</span> at <span className={code}>{u.commit.slice(0, 7)}</span>
              </>
            )}
          </li>
        </ul>
      </Fold>
    </div>
  );
}
