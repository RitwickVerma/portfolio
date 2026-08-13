// Shared scene state — HeroScene writes it, all layers read it
export const sceneState = {
  spin: 0,
  dcRotY: 0,
  dcRotX: 0,
  mouseX: 0.5,
  mouseY: 0.5,
  scroll: 0, // 0-1 scroll progress through the hero pin window
  smoothScroll: 0, // eased copy of scroll — single value drives FOV/dolley/rotation
  _flashPhase: 0, // 0=off, 1=power-on, 2=running, 3=glitch, 4=power-off
  _flashProgress: 0, // 0-1 within current phase
};
