import { describe, expect, it } from 'vitest';
import { MapSchema, ScrapeSchema } from '../src/schemas.ts';

describe('tool schemas', () => {
  it('rejects removed one_map fields at the schema seam', () => {
    expect(MapSchema.safeParse({
      url: 'https://example.com',
      ignoreSitemap: true,
    }).success).toBe(false);

    expect(MapSchema.safeParse({
      url: 'https://example.com',
      sitemapOnly: true,
    }).success).toBe(false);
  });

  it('only accepts the supported one_scrape fields', () => {
    expect(ScrapeSchema.parse({
      url: 'https://example.com',
      formats: ['markdown', 'screenshot@fullPage'],
      waitFor: 250,
      timeout: 2_000,
      skipTlsVerification: true,
      actions: [
        { type: 'wait', milliseconds: 100 },
        { type: 'click', selector: '#submit' },
        { type: 'write', selector: '#email', text: 'test@example.com' },
        { type: 'press', key: 'Enter' },
        { type: 'scroll', direction: 'down' },
        { type: 'executeJavascript', script: 'window.__ready = true' },
      ],
    })).toEqual({
      url: 'https://example.com',
      formats: ['markdown', 'screenshot@fullPage'],
      waitFor: 250,
      timeout: 2_000,
      skipTlsVerification: true,
      actions: [
        { type: 'wait', milliseconds: 100 },
        { type: 'click', selector: '#submit' },
        { type: 'write', selector: '#email', text: 'test@example.com' },
        { type: 'press', key: 'Enter' },
        { type: 'scroll', direction: 'down' },
        { type: 'executeJavascript', script: 'window.__ready = true' },
      ],
    });

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      onlyMainContent: true,
    }).success).toBe(false);

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      actions: [{ type: 'screenshot' }],
    }).success).toBe(false);

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      actions: [{ type: 'scrape' }],
    }).success).toBe(false);

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      location: { country: 'US' },
    }).success).toBe(false);
  });
});
