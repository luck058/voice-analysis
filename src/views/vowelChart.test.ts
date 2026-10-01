import { hzToBark, chartPosition, nearestVowel, referenceSetFor, REFERENCE_VOWELS } from './vowelChart';

describe('vowelChart', () => {
  describe('hzToBark', () => {
    it('should compute Bark value for 1000 Hz', () => {
      expect(hzToBark(1000)).toBeCloseTo(8.5, 1);
    });

    it('should throw RangeError for non-positive inputs', () => {
      expect(() => hzToBark(-1)).toThrow(RangeError);
      expect(() => hzToBark(0)).toThrow(RangeError);
      expect(() => hzToBark(Infinity)).toThrow(RangeError);
      expect(() => hzToBark(NaN)).toThrow(RangeError);
    });
  });

  describe('chartPosition', () => {
    const width = 400;
    const height = 300;

    it('should compute correct position for [i] (front, high)', () => {
      const pos = chartPosition(300, 2300, width, height);
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(width);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(height);
    });

    it('should compute correct position for [ɑ] (back, low)', () => {
      const pos = chartPosition(700, 1100, width, height);
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(width);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(height);
    });

    it('should clamp coordinates to chart bounds', () => {
      // Very high F2 should clamp x to 0
      const pos1 = chartPosition(500, 10000, width, height);
      expect(pos1.x).toBe(0);
      
      // Very low F1 should clamp y to 0
      const pos2 = chartPosition(100, 1500, width, height);
      expect(pos2.y).toBe(0);
      
      // Very low F2 should clamp x to width
      const pos3 = chartPosition(500, 100, width, height);
      expect(pos3.x).toBe(width);
      
      // Very high F1 should clamp y to height
      const pos4 = chartPosition(2000, 1500, width, height);
      expect(pos4.y).toBe(height);
    });

    it('should throw RangeError for invalid inputs', () => {
      expect(() => chartPosition(-1, 1000, width, height)).toThrow(RangeError);
      expect(() => chartPosition(1000, -1, width, height)).toThrow(RangeError);
      expect(() => chartPosition(1000, 1000, -1, height)).toThrow(RangeError);
      expect(() => chartPosition(1000, 1000, width, -1)).toThrow(RangeError);
    });
  });

  describe('nearestVowel', () => {
    it('should identify each reference vowel as its own nearest', () => {
      for (const set of ['men', 'women'] as const) {
        for (const vowel of REFERENCE_VOWELS[set]) {
          const result = nearestVowel(vowel.f1, vowel.f2, set);
          expect(result.vowel.symbol).toBe(vowel.symbol);
          expect(result.distanceBark).toBeCloseTo(0);
        }
      }
    });

    it('should identify [ɑ] as nearest to (700, 1100) in men\'s set', () => {
      const result = nearestVowel(700, 1100, 'men');
      expect(result.vowel.symbol).toBe('ɑ');
    });

    it('should throw RangeError for invalid inputs', () => {
      expect(() => nearestVowel(-1, 1000, 'men')).toThrow(RangeError);
      expect(() => nearestVowel(1000, -1, 'men')).toThrow(RangeError);
      // @ts-expect-error Testing invalid set value
      expect(() => nearestVowel(1000, 1000, 'invalid')).toThrow();
    });
  });

  describe('referenceSetFor', () => {
    it('should return "men" for medianF0Hz < 165 Hz', () => {
      expect(referenceSetFor(120)).toBe('men');
      expect(referenceSetFor(164)).toBe('men');
    });

    it('should return "women" for medianF0Hz >= 165 Hz', () => {
      expect(referenceSetFor(165)).toBe('women');
      expect(referenceSetFor(210)).toBe('women');
    });

    it('should throw RangeError for non-positive inputs', () => {
      expect(() => referenceSetFor(-1)).toThrow(RangeError);
      expect(() => referenceSetFor(0)).toThrow(RangeError);
      expect(() => referenceSetFor(Infinity)).toThrow(RangeError);
      expect(() => referenceSetFor(NaN)).toThrow(RangeError);
    });
  });
});