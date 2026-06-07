import { describe, it, expect } from 'vitest';
import {
  computeTotal,
  buildRepeatedAddition,
  buildMultiplicationSentence,
  getGroupCountingStep,
} from './logic';

describe('computeTotal', () => {
  it('2 × 2 = 4', () => expect(computeTotal(2, 2)).toBe(4));
  it('3 × 4 = 12', () => expect(computeTotal(3, 4)).toBe(12));
  it('5 × 3 = 15', () => expect(computeTotal(5, 3)).toBe(15));
  it('1 × 5 = 5', () => expect(computeTotal(1, 5)).toBe(5));
});

describe('buildRepeatedAddition', () => {
  it('2 crates of 3', () => expect(buildRepeatedAddition(2, 3)).toBe('3 + 3'));
  it('4 crates of 2', () => expect(buildRepeatedAddition(4, 2)).toBe('2 + 2 + 2 + 2'));
  it('1 crate of 5', () => expect(buildRepeatedAddition(1, 5)).toBe('5'));
  it('3 crates of 4', () => expect(buildRepeatedAddition(3, 4)).toBe('4 + 4 + 4'));
  it('0 crates returns empty string', () => expect(buildRepeatedAddition(0, 3)).toBe(''));
});

describe('buildMultiplicationSentence', () => {
  it('2 × 2', () => expect(buildMultiplicationSentence(2, 2)).toBe('2 × 2 = 4'));
  it('3 × 4', () => expect(buildMultiplicationSentence(3, 4)).toBe('3 × 4 = 12'));
  it('5 × 3', () => expect(buildMultiplicationSentence(5, 3)).toBe('5 × 3 = 15'));
});

describe('getGroupCountingStep', () => {
  it('step 1 with 3 apples/group', () =>
    expect(getGroupCountingStep(1, 3)).toEqual({ groupNum: 1, groupTotal: 3, runningTotal: 3 }));
  it('step 2 with 3 apples/group', () =>
    expect(getGroupCountingStep(2, 3)).toEqual({ groupNum: 2, groupTotal: 3, runningTotal: 6 }));
  it('step 3 with 4 apples/group', () =>
    expect(getGroupCountingStep(3, 4)).toEqual({ groupNum: 3, groupTotal: 4, runningTotal: 12 }));
  it('step 5 with 2 apples/group', () =>
    expect(getGroupCountingStep(5, 2)).toEqual({ groupNum: 5, groupTotal: 2, runningTotal: 10 }));
});
