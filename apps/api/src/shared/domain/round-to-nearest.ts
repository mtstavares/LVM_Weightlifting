export function roundToNearest(value: number, increment: number): number {
  if (increment <= 0) {
    throw new Error('Increment must be greater than zero.');
  }

  return Math.round(value / increment) * increment;
}
