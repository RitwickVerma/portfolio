import Crush80 from "@/components/Crush80";
import Section from "@/components/Section";
import { projectAnchor } from "@/lib/corpus";

// The keyboard I reverse-engineered, as the firmware sees it. Pairs with the
// Crush 80 project entry; the matrix data is the board definition from the
// ZMK port, transcribed into lib/crush80.ts.
export default function Keyboard() {
  return (
    <Section
      id="keyboard"
      title="This is my keyboard, as its firmware sees it."
      lede={
        <p>
          A Crush 80, drawn from the 6×16 matrix in its ZMK board definition: 88 switches. The vendor never released
          source, so I{" "}
          <a href={`#${projectAnchor("crush80-firmware")}`} className="link">
            ported open firmware to it
          </a>
          . Click the board and type.
        </p>
      }
    >
      <Crush80 />
    </Section>
  );
}
