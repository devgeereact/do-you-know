import { describe, expect, it } from 'vitest';
import { webHref } from '@/pages/admin/studio';

describe('webHref', () => {
  it('keeps http and https source links', () => {
    expect(webHref('https://www.bbc.co.uk/bitesize')).toBe('https://www.bbc.co.uk/bitesize');
    expect(webHref('http://example.org/page')).toBe('http://example.org/page');
  });

  it('drops script and data links, so a draft can never run code in the Studio', () => {
    expect(webHref('javascript:alert(document.domain)')).toBeUndefined();
    expect(webHref(' JavaScript:alert(1)')).toBeUndefined();
    expect(webHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(webHref('')).toBeUndefined();
    expect(webHref(null)).toBeUndefined();
  });
});
