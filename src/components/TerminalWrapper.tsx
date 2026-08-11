"use client";

import dynamic from "next/dynamic";

const TerminalSection = dynamic(
  () => import("@/components/TerminalSection"),
  { ssr: false },
);

export default function TerminalWrapper() {
  return <TerminalSection />;
}
