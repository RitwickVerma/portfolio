"use client";

import CustomCursor from "@/components/CustomCursor";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomCursor />
      {children}
    </>
  );
}
