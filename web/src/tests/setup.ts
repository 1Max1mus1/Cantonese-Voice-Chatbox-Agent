import { vi } from 'vitest';

// Stub AudioContext to avoid errors in iOS unlock helper during tests
class FakeAudioContext {
  currentTime = 0;
  destination = {} as any;
  resume = vi.fn(async () => {});
  createOscillator() {
    return {
      connect: vi.fn(() => ({ connect: vi.fn(() => this.destination) })),
      start: vi.fn(),
      stop: vi.fn(),
    } as any;
  }
  createGain() {
    return { gain: { value: 0 }, connect: vi.fn(() => this) } as any;
  }
}
(Object.assign(globalThis, { AudioContext: FakeAudioContext }));

// Ensure HTMLMediaElement.play resolves in jsdom
Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn(async () => {}),
});

// Provide URL.createObjectURL if missing
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob://test');
}