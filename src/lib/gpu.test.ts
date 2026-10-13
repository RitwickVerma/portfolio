import { describe, expect, it } from 'vitest';
import { webgpuOptIn } from './gpu';

describe('webgpuOptIn', () => {
  it('defaults to WebGL2 (no opt-in) for every normal visitor', () => {
    expect(webgpuOptIn('')).toBe(false);
    expect(webgpuOptIn('?cb=123')).toBe(false);
    expect(webgpuOptIn('?renderer=webgl2')).toBe(false);
  });

  it('opts in only on the exact query flag', () => {
    expect(webgpuOptIn('?renderer=webgpu')).toBe(true);
    expect(webgpuOptIn('?x=1&renderer=webgpu')).toBe(true);
    expect(webgpuOptIn('?renderer=WEBGPU')).toBe(false);
  });
});
