import { beforeEach, describe, expect, it, vi } from 'vitest';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

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
  const pageClickMock = vi.fn(async () => {});
  const pageFillMock = vi.fn(async () => {});
  const keyboardPressMock = vi.fn(async () => {});
  const pageContentMock = vi.fn(async () => '<main>Hello</main>');
  const pageScreenshotMock = vi.fn(async () => Buffer.from('png'));
  const pageEvaluateMock = vi.fn(async () => undefined);
  const pageRouteMock = vi.fn(async () => {});
  const getPageMock = vi.fn(() => ({
    goto: pageGotoMock,
    click: pageClickMock,
    fill: pageFillMock,
    keyboard: {
      press: keyboardPressMock,
    },
    content: pageContentMock,
    screenshot: pageScreenshotMock,
    evaluate: pageEvaluateMock,
    route: pageRouteMock,
  }));

  const reset = () => {
    launched = false;
    launchMock.mockClear();
    closeMock.mockClear();
    isLaunchedMock.mockClear();
    pageGotoMock.mockClear();
    pageClickMock.mockClear();
    pageFillMock.mockClear();
    keyboardPressMock.mockClear();
    pageContentMock.mockClear();
    pageScreenshotMock.mockClear();
    pageEvaluateMock.mockClear();
    pageRouteMock.mockClear();
    getPageMock.mockClear();
    getPageMock.mockReturnValue({
      goto: pageGotoMock,
      click: pageClickMock,
      fill: pageFillMock,
      keyboard: {
        press: keyboardPressMock,
      },
      content: pageContentMock,
      screenshot: pageScreenshotMock,
      evaluate: pageEvaluateMock,
      route: pageRouteMock,
    });
    pageContentMock.mockResolvedValue('<main>Hello</main>');
    pageScreenshotMock.mockResolvedValue(Buffer.from('png'));
    pageEvaluateMock.mockResolvedValue(undefined);
  };

  return {
    closeMock,
    getPageMock,
    keyboardPressMock,
    isLaunchedMock,
    launchMock,
    pageClickMock,
    pageContentMock,
    pageEvaluateMock,
    pageFillMock,
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

  it('runs supported scrape actions in order before collecting content', async () => {
    const browser = new AgentBrowser({
      headless: true,
      timeout: 1_000,
    });

    const result = await browser.scrapeUrl('https://93.184.216.34', {
      formats: ['html'],
      waitFor: 1,
      actions: [
        { type: 'click', selector: '#start' },
        { type: 'write', selector: '#email', text: 'test@example.com' },
        { type: 'press', key: 'Enter' },
        { type: 'scroll', direction: 'down' },
        { type: 'executeJavascript', script: 'window.__ready = true' },
      ],
    });

    expect(result.success).toBe(true);
    expect(browserState.pageClickMock).toHaveBeenCalledWith('#start');
    expect(browserState.pageFillMock).toHaveBeenCalledWith('#email', 'test@example.com');
    expect(browserState.keyboardPressMock).toHaveBeenCalledWith('Enter');
    expect(browserState.pageEvaluateMock).toHaveBeenNthCalledWith(1, expect.any(Function), 'down');
    expect(browserState.pageEvaluateMock).toHaveBeenNthCalledWith(2, 'window.__ready = true');

    expect(browserState.pageClickMock.mock.invocationCallOrder[0]).toBeLessThan(
      browserState.pageContentMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(browserState.pageFillMock.mock.invocationCallOrder[0]).toBeLessThan(
      browserState.pageContentMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(browserState.keyboardPressMock.mock.invocationCallOrder[0]).toBeLessThan(
      browserState.pageContentMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(browserState.pageEvaluateMock.mock.invocationCallOrder[1]).toBeLessThan(
      browserState.pageContentMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('fails fast when an action errors and does not continue to later actions or content capture', async () => {
    browserState.pageClickMock.mockRejectedValueOnce(new Error('click failed'));
    const browser = new AgentBrowser({
      headless: true,
      timeout: 1_000,
    });

    const result = await browser.scrapeUrl('https://93.184.216.34', {
      formats: ['html'],
      waitFor: 1,
      actions: [
        { type: 'click', selector: '#start' },
        { type: 'write', selector: '#email', text: 'test@example.com' },
      ],
    });

    expect(result).toEqual({
      success: false,
      error: 'click failed',
    });
    expect(browserState.pageFillMock).not.toHaveBeenCalled();
    expect(browserState.pageContentMock).not.toHaveBeenCalled();
  });

  it('waits for executeJavascript actions before collecting content', async () => {
    const deferredScript = createDeferred<void>();
    browserState.pageEvaluateMock.mockImplementation((expression: unknown) => {
      if (typeof expression === 'string') {
        return deferredScript.promise;
      }

      return Promise.resolve(undefined);
    });

    const browser = new AgentBrowser({
      headless: true,
      timeout: 1_000,
    });

    const scrapePromise = browser.scrapeUrl('https://93.184.216.34', {
      formats: ['html'],
      waitFor: 1,
      actions: [
        { type: 'scroll', direction: 'down' },
        { type: 'executeJavascript', script: 'window.__ready = Promise.resolve()' },
      ],
    });

    await Promise.resolve();
    expect(browserState.pageContentMock).not.toHaveBeenCalled();

    deferredScript.resolve();
    const result = await scrapePromise;

    expect(result.success).toBe(true);
    expect(browserState.pageContentMock).toHaveBeenCalledTimes(1);
  });
});
