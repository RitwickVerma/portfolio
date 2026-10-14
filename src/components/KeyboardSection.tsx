import Link from "next/link";
import Crush80 from "@/components/Crush80";

// The keyboard I reverse-engineered, as the firmware sees it. Pairs with the
// Crush 80 project card; the matrix data is the board definition from the
// ZMK port, transcribed into lib/crush80.ts.
export default function KeyboardSection() {
  return (
    <section id="keyboard" className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <div className="grid lg:grid-cols-[1fr_auto] gap-x-12 gap-y-4 items-baseline mb-8">
        <h2 className="font-mono text-muted text-sm tracking-widest uppercase">The keyboard</h2>
        <p className="text-sm text-fg/70 max-w-xl lg:text-right">
          My Crush 80, drawn from the 6×16 matrix in the ZMK board definition for it, after the
          vendor shipped no source. 86 switches, 16 column strobes, 6 row senses.{" "}
          <Link href="/#projects" className="text-accent hover:underline underline-offset-4 whitespace-nowrap">
            Crush 80 firmware project →
          </Link>
        </p>
      </div>
      <Crush80 />
    </section>
  );
}
