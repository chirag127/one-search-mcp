import { beforeEach, describe, expect, it, vi } from 'vitest';

const browserState = vi.hoisted(() => {
  let launched = false;

  const launchMock = vi.fn(async (_options: unknown) => {
    launched = true;
  });
  const closeMock = vi.fn(async () => {
    launched = false;
  });
  const isLaunchedMock = vi.fn(() => launched);
  const pageGotoMock = vi.fn(async () => {});
  const pageContentMock = vi.fn(async () => '<main>Hello</main>');
  const pageScreenshotMock = vi.fn(async () => Buffer.from('png'));
  const pageRouteMock = vi.fn(async () => {});
  const getPageMock = vi.fn(() => ({
    goto: pageGotoMock,
    content: pageContentMock,
    screenshot: pageScreenshotMock,
    route: pageRouteMock,
  }));

  const reset = () => {
    launched = false;
    launchMock.mockClear();
    closeMock.mockClear();
    isLaunchedMock.mockClear();
    pageGotoMock.mockClear();
    pageContentMock.mockClear();
    pageScreenshotMock.mockClear();
    pageRouteMock.mockClear();
    getPageMock.mockClear();
    getPageMock.mockReturnValue({
      goto: pageGotoMock,
      content: pageContentMock,
      screenshot: pageScreenshotMock,
      route: pageRouteMock,
    });
    pageContentMock.mockResolvedValue('<main>Hello</main>');
    pageScreenshotMock.mockResolvedValue(Buffer.from('png'));
  };

  return {
    closeMock,
    getPageMock,
    isLaunchedMock,
    launchMock,
    pageContentMock,
    pageGotoMock,
    pageRouteMock,
    pageScreenshotMock,
    reset,
  };
});

vi.mock('agent-browser/dist/browser.js', () => ({
  BrowserManager: class BrowserManager {
    isLaunched() {
      return browserState.isLaunchedMock();
    }

    async launch(options: unknown) {
      await browserState.launchMock(options);
    }

    getPage() {
      return browserState.getPageMock();
    }

    async close() {
      await browserState.closeMock();
    }
  },
}));

const { AgentBrowser } = await import('../src/libs/agent-browser/index.ts');

describe('AgentBrowser', () => {
  beforeEach(() => {
    browserState.reset();
  });

  it('uses the configured navigation timeout and TLS policy when launching', async () => {
    const browser = new AgentBrowser({
      headless: true,
      timeout: 4_321,
      ignoreHttpsErrors: true,
    });

    const result = await browser.scrapeUrl('https://93.184.216.34', {
      formats: ['html'],
      waitFor: 1,
    });

    expect(result.success).toBe(true);
    expect(browserState.launchMock).toHaveBeenCalledWith(expect.objectContaining({
      headless: true,
      ignoreHTTPSErrors: true,
    }));
    expect(browserState.pageGotoMock).toHaveBeenCalledWith(
      'https://93.184.216.34',
      expect.objectContaining({
        timeout: 4_321,
        waitUntil: 'domcontentloaded',
      }),
    );
  });

  it('takes a full-page screenshot when screenshot@fullPage is requested', async () => {
    const browser = new AgentBrowser({
      headless: true,
      timeout: 1_000,
    });

    const result = await browser.scrapeUrl('https://93.184.216.34', {
      formats: ['screenshot@fullPage'],
      waitFor: 1,
    });

    expect(result.success).toBe(true);
    expect(browserState.pageScreenshotMock).toHaveBeenCalledWith({
      type: 'png',
      fullPage: true,
    });
    expect(result.screenshot).toBe('data:image/png;base64,cG5n');
  });
});
