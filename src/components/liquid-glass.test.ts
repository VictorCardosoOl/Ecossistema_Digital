import { describe, it, expect, vi } from 'vitest';
import { initLiquidGlass } from './liquid-glass';

describe('Liquid Glass Component', () => {
  it('should be a function', () => {
    expect(typeof initLiquidGlass).toBe('function');
  });

  it('should initialize without crashing on empty document', () => {
    // Basic DOM mock
    document.body.innerHTML = '<div></div>';
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    expect(() => {
      initLiquidGlass();
    }).not.toThrow();
  });
});
