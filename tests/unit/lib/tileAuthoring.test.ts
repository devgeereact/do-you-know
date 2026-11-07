import { describe, expect, it } from 'vitest';
import {
  gapCount,
  gapFields,
  gapSpec,
  lettersOf,
  orderSpec,
  spellFields,
  spellSpec,
  splitList,
} from '@/lib/tileAuthoring';

describe('tile authoring helpers', () => {
  it('splits a comma list and drops empties', () => {
    expect(splitList(' sat, mat ,, dog ')).toEqual(['sat', 'mat', 'dog']);
    expect(splitList('')).toEqual([]);
  });

  it('turns a word into letter tiles and ignores spaces', () => {
    expect(lettersOf('b a n')).toEqual(['b', 'a', 'n']);
  });

  it('builds a spelling question with decoy letters and optional dictation', () => {
    expect(spellSpec('cat', 'xz', false)).toEqual({
      variant: 'spell',
      tiles: ['c', 'a', 't', 'x', 'z'],
      answers: [['c', 'a', 't']],
    });
    expect(spellSpec('cat', '', true).speak).toBe('cat');
    expect(spellSpec('', '', true).speak).toBeUndefined();
  });

  it('reads a spelling question back into the form fields', () => {
    expect(spellFields(spellSpec('banana', 'xy', true))).toEqual({
      word: 'banana',
      extra: 'xy',
      speak: true,
    });
  });

  it('builds a gap question: the answer words, the other right answers, and the decoys', () => {
    const spec = gapSpec('The cat ___ on the ___.', ['sat', 'mat'], ['dog'], [['sits', 'mat']]);
    expect(spec.answers).toEqual([
      ['sat', 'mat'],
      ['sits', 'mat'],
    ]);
    expect(spec.tiles).toEqual(['sat', 'mat', 'sits', 'dog']);
    expect(spec.template).toBe('The cat ___ on the ___.');
  });

  it('keeps a word twice when one answer needs it twice', () => {
    expect(gapSpec('___ and ___', ['the', 'the'], []).tiles).toEqual(['the', 'the']);
  });

  it('reads a gap question back into the form fields', () => {
    const spec = gapSpec(
      'The cat ___ on the ___.',
      ['sat', 'mat'],
      ['dog', 'ran'],
      [['sits', 'mat']],
    );
    expect(gapFields(spec)).toEqual({
      template: 'The cat ___ on the ___.',
      answer: 'sat, mat',
      extra: 'dog, ran',
      also: ['sits, mat'],
    });
  });

  it('builds an order question from its cards', () => {
    expect(orderSpec(['a', 'b', 'c'])).toEqual({
      variant: 'order',
      tiles: ['a', 'b', 'c'],
      answers: [['a', 'b', 'c']],
    });
  });

  it('counts the gaps in a sentence', () => {
    expect(gapCount('The ___ sat on the ___.')).toBe(2);
    expect(gapCount('No gaps')).toBe(0);
  });
});
