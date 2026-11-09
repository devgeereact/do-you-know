/** Up to this many files in one Add. */
export const MAX_IMPORT_FILES = 40;

export interface PickedFile {
  name: string;
  text: string;
}

export type Combined = { ok: true; text: string; count: number } | { ok: false; message: string };

/**
 * Several files become one text for the Import screen. Each file keeps its own "# heading" lines, so
 * every heading is still its own quiz. A CSV carries its own header row, so it is only accepted alone.
 */
export function combineImportFiles(files: PickedFile[]): Combined {
  if (files.length === 0) return { ok: false, message: 'Choose at least one file.' };
  if (files.length > MAX_IMPORT_FILES) {
    return { ok: false, message: `Up to ${MAX_IMPORT_FILES} files at once.` };
  }
  const bad = files.find((f) => !/\.(txt|csv|md)$/i.test(f.name));
  if (bad) return { ok: false, message: `Use .txt, .csv or .md files. “${bad.name}” is not one.` };
  if (files.length > 1 && files.some((f) => /\.csv$/i.test(f.name))) {
    return {
      ok: false,
      message: 'A CSV has its own header row, so add it on its own, not with other files.',
    };
  }
  const texts = files
    .map((f) =>
      f.text
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n')
        .trim(),
    )
    .filter((t) => t.length > 0);
  if (texts.length === 0) return { ok: false, message: 'Those files are empty.' };
  return { ok: true, text: texts.join('\n\n'), count: files.length };
}
