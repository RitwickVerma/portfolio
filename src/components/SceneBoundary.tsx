"use client";

import { Component, type ReactNode } from "react";

/**
 * Last line of defence for the WebGL layers. If three.js throws while
 * creating a context (locked-down laptops, broken drivers, headless
 * browsers) the children unmount and whatever sits beneath them — the hero's
 * SVG poster, the plain page background — stays on screen. Without this the
 * error would unmount the whole page.
 */
export default class SceneBoundary extends Component<
  { label: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`[${this.props.label}] disabled after an error; static fallback stays`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
