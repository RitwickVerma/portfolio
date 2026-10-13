/** A numbered sheet: the section number and title sit in the margin column. */
export default function Sheet({
  id,
  no,
  label,
  children,
}: {
  id?: string;
  no: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="sheet frame" aria-labelledby={id ? `${id}-label` : undefined}>
      <div className="sheet-grid">
        <div className="sheet-margin">
          <span className="sheet-no">§ {no}</span>
          <span className="label" id={id ? `${id}-label` : undefined}>
            {label}
          </span>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
