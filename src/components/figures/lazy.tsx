"use client";

import dynamic from "next/dynamic";

// The figures the notes use, each as a chunk of its own. A note's MDX imports
// its figures from here, so a reader of one note downloads that note's figures
// and no other's: /notes/[slug] is one route, and without this every note
// carried every figure. The server still renders each figure's first state.

export const Ambilight = dynamic(() => import("./Ambilight"));
export const BackupsFigure = dynamic(() => import("./BackupsFigure"));
export const BootstrapPath = dynamic(() => import("./BootstrapPath"));
export const Ceiling = dynamic(() => import("./Ceiling"));
export const ChordAlignment = dynamic(() => import("./ChordAlignment"));
export const ClockDrift = dynamic(() => import("./ClockDrift"));
export const DriftFigure = dynamic(() => import("./DriftFigure"));
export const FrameAuthority = dynamic(() => import("./FrameAuthority"));
export const KeymapLayers = dynamic(() => import("./KeymapLayers"));
export const LimiterTimeline = dynamic(() => import("./LimiterTimeline"));
export const PagingFigure = dynamic(() => import("./PagingFigure"));
export const PqToLed = dynamic(() => import("./PqToLed"));
export const SignatureBytes = dynamic(() => import("./SignatureBytes"));
export const SurvivorToy = dynamic(() => import("./SurvivorToy"));
export const UniverseSwitch = dynamic(() => import("./UniverseSwitch"));
export const WaveOrReach = dynamic(() => import("./WaveOrReach"));
