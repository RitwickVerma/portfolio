import type { PublicApp } from "@/lib/apps";

// The app's launcher icon in its own mask. Adaptive icons ship as two layers
// drawn on a 108dp canvas of which the phone shows the centre 72dp, so the
// layers are stacked and scaled 1.5x inside the mask, as the launcher does.
// Plain <img>: the site is a static export and the files are tiny.
export default function AppIcon({ app, size, className = "" }: { app: PublicApp; size: number; className?: string }) {
  const adaptive = Boolean(app.iconBackdropSrc);
  const layer = adaptive ? { transform: "scale(1.5)" } : undefined;
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: "var(--r-icon)", background: app.iconBadgeBg }}
    >
      {app.iconBackdropSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={app.iconBackdropSrc} alt="" width={size} height={size} className="absolute inset-0 size-full" style={layer} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={app.iconSrc} alt="" width={size} height={size} className="relative size-full" style={layer} />
    </span>
  );
}
