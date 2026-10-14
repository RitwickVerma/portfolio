import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center min-h-screen">
      <p className="font-mono text-muted text-sm tracking-widest uppercase">404</p>
      <h1 className="text-2xl font-semibold">That page isn&apos;t here.</h1>
      <Link href="/" className="text-accent hover:underline underline-offset-4">
        Back to ritwickverma.dev
      </Link>
    </main>
  );
}
