import { describe, expect, it } from 'vitest';
import { combineImportFiles, MAX_IMPORT_FILES } from '@/lib/importFiles';

const file = (name: string, text: string) => ({ name, text });

describe('combining files for one Add', () => {
  it('joins text files with a blank line, each keeping its own headings', () => {
    const r = combineImportFiles([
      file('a.txt', '# Maths · KS2\nQ: One?\n'),
      file('b.md', '# Science\nQ: Two?\n'),
    ]);
    expect(r).toEqual({ ok: true, text: '# Maths · KS2\nQ: One?\n\n# Science\nQ: Two?', count: 2 });
  });

  it('takes one file as it is, minus the byte order mark and carriage returns', () => {
    const r = combineImportFiles([file('a.txt', '﻿Q: One?\r\nA) x*\r\n')]);
    expect(r).toEqual({ ok: true, text: 'Q: One?\nA) x*', count: 1 });
  });

  it('accepts a single CSV on its own', () => {
    expect(combineImportFiles([file('q.csv', 'subject,question\nmaths,One')])).toMatchObject({
      ok: true,
      count: 1,
    });
  });

  it('refuses a CSV mixed with other files, because its header row would be lost', () => {
    const r = combineImportFiles([
      file('q.csv', 'subject,question\nmaths,One'),
      file('a.txt', 'Q: x'),
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/CSV/);
  });

  it('refuses other file types and names the file', () => {
    const r = combineImportFiles([file('a.txt', 'Q: x'), file('notes.docx', 'x')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('notes.docx');
  });

  it('refuses nothing, and empty files', () => {
    expect(combineImportFiles([]).ok).toBe(false);
    expect(combineImportFiles([file('a.txt', '   \n')]).ok).toBe(false);
  });

  it('allows up to the file limit and no more', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => file(`f${i}.txt`, `Q: ${i}?`));
    expect(combineImportFiles(many(MAX_IMPORT_FILES)).ok).toBe(true);
    const over = combineImportFiles(many(MAX_IMPORT_FILES + 1));
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.message).toContain(String(MAX_IMPORT_FILES));
  });
});
