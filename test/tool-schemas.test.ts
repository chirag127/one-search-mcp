import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import { MapSchema, ScrapeSchema } from '../src/schemas.ts';
import { SCRAPE_TOOL } from '../src/tools.ts';

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
      allowExecuteJavascript: true,
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
      allowExecuteJavascript: true,
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
      actions: [{ type: 'executeJavascript', script: 'window.__ready = true' }],
    }).success).toBe(false);

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      allowExecuteJavascript: true,
      actions: [{ type: 'executeJavascript', script: 'window.__ready = true' }],
    }).success).toBe(true);

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      actions: [{ type: 'scrape' }],
    }).success).toBe(false);

    expect(ScrapeSchema.safeParse({
      url: 'https://example.com',
      location: { country: 'US' },
    }).success).toBe(false);
  });

  it('exposes one_scrape input fields through tools/list for inspector forms', async () => {
    const server = new McpServer(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    server.registerTool(
      SCRAPE_TOOL.name,
      {
        description: SCRAPE_TOOL.description,
        inputSchema: SCRAPE_TOOL.schema,
      },
      async () => ({
        content: [
          {
            type: 'text' as const,
            text: 'ok',
          },
        ],
      }),
    );

    const client = new Client({
      name: 'test-client',
      version: '1.0.0',
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      const result = await client.listTools();
      const scrapeTool = result.tools.find((tool) => tool.name === SCRAPE_TOOL.name);

      expect(scrapeTool?.inputSchema.properties).toMatchObject({
        url: expect.any(Object),
        formats: expect.any(Object),
        waitFor: expect.any(Object),
        timeout: expect.any(Object),
        skipTlsVerification: expect.any(Object),
        allowExecuteJavascript: expect.any(Object),
        actions: expect.any(Object),
      });
    } finally {
      await Promise.all([
        client.close(),
        server.close(),
      ]);
    }
  });
});
