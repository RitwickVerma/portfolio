"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-solid"
      style={{ height: 38 }}
    >
      Save as PDF
    </button>
  );
}
