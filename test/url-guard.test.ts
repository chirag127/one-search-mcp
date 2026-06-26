import { describe, expect, it, vi } from 'vitest';
import type { Page, Route } from 'playwright-core';
import { assertUrlIsSafe, installUrlProtection } from '../src/libs/agent-browser/url-guard.ts';

type LookupResult = { address: string; family: 4 | 6 };

function createLookup(addresses: LookupResult[]) {
  return vi.fn(async () => addresses);
}

function createRoute(url: string) {
  return {
    request: () => ({
      url: () => url,
    }),
    abort: vi.fn(async () => {}),
    continue: vi.fn(async () => {}),
  } satisfies Pick<Route, 'request' | 'abort' | 'continue'>;
}

describe('assertUrlIsSafe', () => {
  it('rejects loopback targets', async () => {
    await expect(assertUrlIsSafe('http://127.0.0.1')).rejects.toThrow(/blocked/i);
  });

  it('rejects blocked IPv6 ranges', async () => {
    await expect(assertUrlIsSafe('http://[::1]')).rejects.toThrow(/blocked/i);
    await expect(assertUrlIsSafe('https://[fc00::1]')).rejects.toThrow(/blocked/i);
    await expect(assertUrlIsSafe('https://[fe80::1]')).rejects.toThrow(/blocked/i);
  });

  it('rejects hostnames that resolve to private addresses', async () => {
    const lookup = createLookup([{ address: '192.168.1.10', family: 4 }]);

    await expect(assertUrlIsSafe('https://internal.example', lookup)).rejects.toThrow(/blocked/i);
  });

  it('rejects hostnames with mixed public and private DNS answers', async () => {
    const lookup = createLookup([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(assertUrlIsSafe('https://example.com', lookup)).rejects.toThrow(/blocked/i);
  });

  it('allows public https targets', async () => {
    const lookup = createLookup([{ address: '93.184.216.34', family: 4 }]);

    await expect(assertUrlIsSafe('https://example.com', lookup)).resolves.toMatchObject({
      hostname: 'example.com',
    });
  });

  it('allows private targets when ALLOW_PRIVATE_NETWORK is enabled', async () => {
    vi.stubEnv('ALLOW_PRIVATE_NETWORK', 'true');
    const lookup = createLookup([{ address: '192.168.1.10', family: 4 }]);

    await expect(assertUrlIsSafe('https://internal.example', lookup)).resolves.toMatchObject({
      hostname: 'internal.example',
    });

    vi.unstubAllEnvs();
  });
});

describe('installUrlProtection', () => {
  it('aborts redirected requests that resolve to blocked addresses', async () => {
    const handlers: Array<(route: Pick<Route, 'request' | 'abort' | 'continue'>) => Promise<void>> = [];
    const page = {
      route: vi.fn(async (_matcher: string, handler: (route: Pick<Route, 'request' | 'abort' | 'continue'>) => Promise<void>) => {
        handlers.push(handler);
      }),
    } satisfies Pick<Page, 'route'>;
    const lookup = createLookup([{ address: '93.184.216.34', family: 4 }]);
    const redirectLookup = createLookup([{ address: '169.254.169.254', family: 4 }]);

    await installUrlProtection(page, (hostname) => {
      if (hostname === 'example.com') {
        return lookup(hostname);
      }

      return redirectLookup(hostname);
    });

    const route = createRoute('http://169.254.169.254/latest/meta-data/');
    await handlers[0](route);

    expect(route.abort).toHaveBeenCalledTimes(1);
    expect(route.continue).not.toHaveBeenCalled();
  });

  it('aborts subresource requests that resolve to blocked addresses', async () => {
    const handlers: Array<(route: Pick<Route, 'request' | 'abort' | 'continue'>) => Promise<void>> = [];
    const page = {
      route: vi.fn(async (_matcher: string, handler: (route: Pick<Route, 'request' | 'abort' | 'continue'>) => Promise<void>) => {
        handlers.push(handler);
      }),
    } satisfies Pick<Page, 'route'>;
    const lookup = createLookup([{ address: '169.254.169.254', family: 4 }]);

    await installUrlProtection(page, lookup);

    const route = createRoute('https://assets.example/script.js');
    await handlers[0](route);

    expect(lookup).toHaveBeenCalledWith('assets.example');
    expect(route.abort).toHaveBeenCalledTimes(1);
    expect(route.continue).not.toHaveBeenCalled();
  });

  it('allows private redirect targets when ALLOW_PRIVATE_NETWORK is enabled', async () => {
    vi.stubEnv('ALLOW_PRIVATE_NETWORK', 'true');

    const handlers: Array<(route: Pick<Route, 'request' | 'abort' | 'continue'>) => Promise<void>> = [];
    const page = {
      route: vi.fn(async (_matcher: string, handler: (route: Pick<Route, 'request' | 'abort' | 'continue'>) => Promise<void>) => {
        handlers.push(handler);
      }),
    } satisfies Pick<Page, 'route'>;

    await installUrlProtection(page, createLookup([{ address: '169.254.169.254', family: 4 }]));

    const route = createRoute('http://169.254.169.254/latest/meta-data/');
    await handlers[0](route);

    expect(route.continue).toHaveBeenCalledTimes(1);
    expect(route.abort).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });
});
