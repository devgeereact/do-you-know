export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Web Share where the browser has it, otherwise copy "text url" to the clipboard.
 * Closing the share sheet is not an error and gets no fallback.
 */
export async function shareOrCopy(url: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Do You Know', text, url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
