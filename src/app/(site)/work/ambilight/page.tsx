import type { Metadata } from "next";
import Sheet from "@/components/Sheet";
import { CaseHeader, Callout, Fig, NextCase, Step } from "@/components/case";
import { MeasurementTrapFig, PipelineFig, SideZonesFig, ZoneSampleFig } from "@/components/AmbilightFigures";

export const metadata: Metadata = {
  title: "The TV that lights its own room",
  description:
    "Reverse-engineering a Samsung TV's video capture to drive a 75-LED ambilight from the live picture — and why profiling, not intuition, took it from 8 to 46 frames per second.",
  alternates: { canonical: "/work/ambilight/" },
};

export default function Ambilight() {
  return (
    <>
      <CaseHeader
        slug="ambilight"
        abstract={
          <p>
            Ambient TV lighting usually means an HDMI capture box or a camera pointed at the screen. I wanted the TV
            to drive the lights from its own picture. That meant finding a capture path Samsung doesn’t document,
            then making it fast — which turned out to be a lesson in measuring the right thing.
          </p>
        }
      />

      <Sheet no="01" label="Pipeline">
        <div className="case-body">
          <Fig no="1" caption="The whole path, inside the TV. No file, no encoder, no intermediate service — six stages from video plane to LED strip.">
            <PipelineFig />
          </Fig>

          <Step no="1.1" title="The obvious API goes dark">
            <p>
              The documented screen-capture route returns the UI plane. The moment a video starts, it goes black —
              its mean brightness fell from <strong>108.5 to 24.7</strong> as playback began. Useless for ambient
              light. The picture lives on a separate video plane, reachable through a native capture call in the
              TV’s video library.
            </p>
            <p>
              Two details took real digging. The library exports three capture symbols that turned out to be
              instruction-identical — the plane is chosen by a parameter struct, not by which name you call. And
              the chroma layout of the returned buffer was settled from the bytes themselves, not from an
              assumption about the format.
            </p>
          </Step>

          <Step no="1.2" title="Do the math 73 times, not 518,400 times">
            <p>
              The first version converted every pixel of the 960×540 frame to RGB and then averaged rectangles of
              the result: <strong>116 ms a frame, about 8 fps</strong>. Averaging in YUV per zone first and running
              the colour matrix once per zone — 73 times instead of 518,400 — was the single biggest win available.
            </p>
            <p>
              The same rule applied to HDR. The video plane carries PQ-encoded BT.2020; decoding the transfer
              per pixel measured <strong>8.7× the cost</strong> of decoding per zone, for no visible difference in
              an average.
            </p>
          </Step>
        </div>
      </Sheet>

      <Sheet no="02" label="Measurement">
        <div className="case-body">
          <Step no="2.1" title="The counters that couldn’t see the change">
            <p>
              After a change to the zone stage, the app’s own timing stats barely moved. They were lifetime
              averages — sum over frame count — so a large change in current behaviour was diluted by every frame
              that came before it. The real frame time had gone from <strong>~98 ms to ~13 ms</strong>; the
              counter that was supposed to report it sat flat at about 11.
            </p>
            <p>
              The fix was to stop trusting the instrument and count delivered frames over a known interval, an
              independent check that agreed with the one windowed metric to within about ten percent.
            </p>
          </Step>

          <Fig no="2" caption="Schematic of the trap. Endpoints are measured; the shape between them is illustrative. A lifetime mean describes history, not now.">
            <MeasurementTrapFig />
          </Fig>

          <Callout>
            The capture wasn’t the bottleneck. Reading 73 scattered rectangles — about 210,000 reads per frame
            with poor cache locality — cost more than the native capture call itself.
          </Callout>

          <Step no="2.2" title="Pulling the right lever">
            <p>
              Requesting a smaller capture changed nothing: 960×540, 640×360, 480×270 and 320×180 all came back
              as 960×540 in identical time. The library ignores the request, so that lever doesn’t exist. The
              real lever was sampling inside each zone. A zone covers 1,700–3,200 pixels — far more than an average
              needs — so reading every third pixel on each axis cuts the work ninefold.
            </p>
          </Step>

          <Fig no="3" caption="Measured on the TV, same frame, against an every-pixel reference. zs = 3 is the shipped default: 46.4 fps at a mean colour error of 3.5, with 89% of zones within ±3 of the reference.">
            <ZoneSampleFig />
          </Fig>
        </div>
      </Sheet>

      <Sheet no="03" label="Open issue">
        <div className="case-body">
          <Step no="3.1" title="The bug I found and haven’t shipped">
            <p>
              Reporting every zone, instead of a 12-zone sample, exposed something the sample had hidden: each side
              zone was computing its own vertical segment and then overwriting it with the full height. On the left
              and right edges, <strong>11 of 13 zones show the same colour</strong> — 22 of 73 zones, about 30% of
              the strip. Those full-height side zones were also the bulk of the sampling work.
            </p>
            <p>
              The fix is a few lines. It isn’t merged, because it visibly changes how both sides of the room look,
              and the current look was explicitly approved. It’s queued for a side-by-side sign-off instead of being
              slipped in with a performance change.
            </p>
          </Step>

          <Fig no="4" caption="Zone geometry, measured; the picture is illustrative. As shipped, each side collapses to the corner zones plus one repeated colour.">
            <SideZonesFig />
          </Fig>

          <Step no="3.2" title="Sharp edges, written down">
            <p>
              Installing a new build over a running capture wedges the TV’s scaler until a reboot (3 deploys out of
              3), so deploys stop the service first. The LED controller’s automatic brightness limiter was quietly
              halving output, and live-streaming modes ignore its saved state, which invalidated one round of
              tuning. Each of these is now a written rule, not tribal memory.
            </p>
          </Step>
        </div>
      </Sheet>

      <NextCase slug="ambilight" />
    </>
  );
}
