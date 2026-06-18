import { roundToNearest } from './round-to-nearest';

describe('roundToNearest', () => {
  it('rounds to the nearest olympic increment', () => {
    expect(roundToNearest(92.96, 1)).toBe(93);
    expect(roundToNearest(127.4, 2.5)).toBe(127.5);
  });

  it('rejects invalid increments', () => {
    expect(() => roundToNearest(100, 0)).toThrow('Increment must be greater than zero.');
  });
});
