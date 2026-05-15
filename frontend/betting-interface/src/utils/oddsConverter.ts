export type OddsFormat = 'decimal' | 'american' | 'fractional';

export function decimalToAmerican(decimal: number): string {
  if (decimal <= 1) return '0';
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimal - 1))}`;
}

export function decimalToFractional(decimal: number): string {
  if (decimal <= 1) return '0/1';
  const numerator = Math.round((decimal - 1) * 100);
  const denominator = 100;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

export function americanToDecimal(american: number): number {
  if (american === 0) return 1;
  if (american > 0) {
    return 1 + american / 100;
  }
  return 1 + 100 / Math.abs(american);
}

export function fractionalToDecimal(numerator: number, denominator: number): number {
  if (denominator === 0) return 1;
  return 1 + numerator / denominator;
}

export function convertOdds(odds: number, from: OddsFormat, to: OddsFormat): string {
  if (from === to) {
    if (from === 'decimal') return odds.toFixed(2);
    if (from === 'american') return String(odds);
    return String(odds);
  }

  let decimal: number;
  switch (from) {
    case 'decimal':
      decimal = odds;
      break;
    case 'american':
      decimal = americanToDecimal(odds);
      break;
    case 'fractional':
      decimal = odds;
      break;
    default:
      decimal = odds;
  }

  switch (to) {
    case 'decimal':
      return decimal.toFixed(2);
    case 'american':
      return decimalToAmerican(decimal);
    case 'fractional':
      return decimalToFractional(decimal);
    default:
      return decimal.toFixed(2);
  }
}

export function getImpliedProbability(odds: number, format: OddsFormat): number {
  let decimal: number;
  switch (format) {
    case 'decimal':
      decimal = odds;
      break;
    case 'american':
      decimal = americanToDecimal(odds);
      break;
    default:
      decimal = odds;
  }
  if (decimal <= 1) return 0;
  return 1 / decimal;
}
