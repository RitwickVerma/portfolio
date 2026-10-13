import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return (
    <main id="main" className="frame" style={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: 18 }}>
      <p className="label label-signal">Sheet missing · 404</p>
      <h1 className="display" style={{ fontSize: "clamp(44px, 6vw, 84px)" }}>
        This page isn’t <em>in the drawing set.</em>
      </h1>
      <Link className="btn btn-solid" href="/" style={{ justifySelf: "start", marginTop: 12 }}>
        Back to the index <span className="arrow" aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
