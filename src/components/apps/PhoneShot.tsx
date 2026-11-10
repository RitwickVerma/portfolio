// A real screenshot in a plain phone body. The frame is drawn in CSS (no
// device mockup image), so it takes the page's own palette: --frame for the
// body, --frame-edge for the hairline around it.
export default function PhoneShot({
  src,
  alt,
  width,
  height,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[2.2rem] bg-[var(--frame)] p-[0.55rem] ring-1 ring-[var(--frame-edge)] ${className}`}
    >
      <div className="overflow-hidden rounded-[1.75rem] bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}
