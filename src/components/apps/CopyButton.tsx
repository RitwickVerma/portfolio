"use client";

import { useState } from "react";

// Copies a code block's text. The block stays selectable without JavaScript;
// this only saves the drag.
export default function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className={className}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
