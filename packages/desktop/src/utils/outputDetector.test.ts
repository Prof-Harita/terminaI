import { describe, it, expect } from 'vitest';
import { detectOutputType, detectTuiExit } from './outputDetector';

describe('outputDetector', () => {
  describe('detectOutputType', () => {
    it('detects TUI start sequences', () => {
      // Common terminal clear/init sequences
      expect(detectOutputType('\x1b[?1049h')).toBe('tui'); // Alternate screen buffer
      expect(detectOutputType('\x1b[?1h')).toBe('tui');    // Application cursor keys
    });

    it('detects progress updates', () => {
      expect(detectOutputType('Progress: [====>    ] 50%')).toBe('progress');
      expect(detectOutputType('Downloading... 45%')).toBe('progress');
      expect(detectOutputType('Copying files (1/5)')).toBe('progress');
    });

    it('defaults to text for normal output', () => {
      expect(detectOutputType('Hello world')).toBe('text');
      expect(detectOutputType('ls -la')).toBe('text');
      expect(detectOutputType('\x1b[31mRed text\x1b[0m')).toBe('text'); // Formatting, not TUI
    });
  });

  describe('detectTuiExit', () => {
    it('detects TUI exit sequences', () => {
      expect(detectTuiExit('\x1b[?1049l')).toBe(true);
    });

    it('ignores non-exit sequences', () => {
      expect(detectTuiExit('some output')).toBe(false);
      expect(detectTuiExit('\x1b[?1049h')).toBe(false);
    });
  });
});
