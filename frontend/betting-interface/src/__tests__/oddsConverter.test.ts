import { describe, it, expect } from 'vitest';
import {
  decimalToAmerican,
  decimalToFractional,
  americanToDecimal,
  fractionalToDecimal,
  convertOdds,
  getImpliedProbability,
} from '../utils/oddsConverter';

describe('decimalToAmerican', () => {
  it('converts decimal odds >= 2 to positive American odds', () => {
    expect(decimalToAmerican(2.0)).toBe('+100');
    expect(decimalToAmerican(3.0)).toBe('+200');
    expect(decimalToAmerican(1.8)).toBe('-125');
  });

  it('converts decimal odds < 2 to negative American odds', () => {
    expect(decimalToAmerican(1.5)).toBe('-200');
    expect(decimalToAmerican(1.25)).toBe('-400');
  });

  it('handles edge case of 1.0', () => {
    expect(decimalToAmerican(1.0)).toBe('0');
  });
});

describe('decimalToFractional', () => {
  it('converts decimal odds to fractional format', () => {
    expect(decimalToFractional(2.0)).toBe('100/100');
    expect(decimalToFractional(3.0)).toBe('200/100');
  });

  it('simplifies fractions', () => {
    const result = decimalToFractional(1.5);
    expect(result).toMatch(/^\d+\/\d+$/);
  });

  it('handles 1.0 odds', () => {
    expect(decimalToFractional(1.0)).toBe('0/1');
  });
});

describe('americanToDecimal', () => {
  it('converts positive American odds', () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0);
    expect(americanToDecimal(200)).toBeCloseTo(3.0);
  });

  it('converts negative American odds', () => {
    expect(americanToDecimal(-200)).toBeCloseTo(1.5);
    expect(americanToDecimal(-125)).toBeCloseTo(1.8);
  });
});

describe('fractionalToDecimal', () => {
  it('converts fractional odds to decimal', () => {
    expect(fractionalToDecimal(1, 1)).toBeCloseTo(2.0);
    expect(fractionalToDecimal(2, 1)).toBeCloseTo(3.0);
    expect(fractionalToDecimal(1, 2)).toBeCloseTo(1.5);
  });

  it('handles zero denominator', () => {
    expect(fractionalToDecimal(1, 0)).toBe(1);
  });
});

describe('convertOdds', () => {
  it('converts decimal to american', () => {
    expect(convertOdds(2.0, 'decimal', 'american')).toBe('+100');
  });

  it('converts decimal to fractional', () => {
    expect(convertOdds(2.0, 'decimal', 'fractional')).toBe('100/100');
  });
});

describe('getImpliedProbability', () => {
  it('calculates implied probability from decimal odds', () => {
    const prob = getImpliedProbability(2.0, 'decimal');
    expect(prob).toBeCloseTo(0.5);
  });

  it('calculates implied probability from American odds', () => {
    const prob = getImpliedProbability(100, 'american');
    expect(prob).toBeCloseTo(0.5);
  });

  it('returns 0 for impossible odds', () => {
    expect(getImpliedProbability(1.0, 'decimal')).toBe(0);
  });
});
