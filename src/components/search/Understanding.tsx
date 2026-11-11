import Link from "next/link";
import { Fragment } from "react";
import { takeApartHref, type Understanding } from "@/lib/understanding";

/**
 * The one line under the box that says what the engine did with the words. The room for it is kept whether
 * or not there is anything to say (two lines on a phone), so a query that gets a rewrite or a respelling does
 * not move the results under it. A word the engine respelled to is marked: it is what matched.
 */
export function UnderstandingLine({ items, query }: { items: Understanding[]; query: string }) {
  return (
    <div className="mt-3 min-h-[3.25rem] sm:min-h-7" data-testid="understanding">
      {items.length > 0 && (
        <p className="fact">
          {items.map((u, i) => (
            <Fragment key={`${u.kind}-${u.label}`}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <span data-kind={u.kind}>
                {u.found !== undefined && u.label.startsWith(u.found) ? (
                  <>
                    <mark>{u.found}</mark>
                    {u.label.slice(u.found.length)}
                  </>
                ) : (
                  u.label
                )}
              </span>
            </Fragment>
          ))}
          {/* A gap, not a dot: on a phone the link wraps, and a dot would be left hanging at the end of the line. */}
          <Link href={takeApartHref(query)} className="link ml-4">
            Take it apart
          </Link>
        </p>
      )}
    </div>
  );
}
