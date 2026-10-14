"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-3 rounded-lg bg-accent text-background text-sm font-medium hover:bg-accent/90 transition-colors"
    >
      Save as PDF
    </button>
  );
}
