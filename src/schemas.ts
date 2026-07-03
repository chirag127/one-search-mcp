import { z } from 'zod/v3';

// Search Schema
export const SearchSchema = z.object({
  query: z.string().describe('Search query string'),
  limit: z.number().optional().describe('Maximum number of results to return (default: 10)'),
  language: z.string().optional().describe('Language code for search results (default: auto)'),
  categories: z.enum([
    'general',
    'news',
    'images',
    'videos',
    'it',
    'science',
    'map',
    'music',
    'files',
    'social_media',
  ]).optional().describe('Categories to search for (default: general)'),
  timeRange: z.enum([
    'all',
    'day',
    'week',
    'month',
    'year',
  ]).optional().describe('Time range for search results (default: all)'),
});

export type SearchInput = z.infer<typeof SearchSchema>;

// Map Schema
export const MapSchema = z.object({
  url: z.string().describe('Starting URL for URL discovery'),
  search: z.string().optional().describe('Optional search term to filter URLs'),
  includeSubdomains: z.boolean().optional().describe('Include URLs from subdomains in results'),
  limit: z.number().optional().describe('Maximum number of URLs to return'),
}).strict();

export type MapInput = z.infer<typeof MapSchema>;

const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('wait'),
    milliseconds: z.number().describe('Time to wait in milliseconds'),
  }),
  z.object({
    type: z.literal('click'),
    selector: z.string().describe('CSS selector for the target element'),
  }),
  z.object({
    type: z.literal('write'),
    selector: z.string().describe('CSS selector for the target element'),
    text: z.string().describe('Text to write'),
  }),
  z.object({
    type: z.literal('press'),
    key: z.string().describe('Key to press'),
  }),
  z.object({
    type: z.literal('scroll'),
    direction: z.enum(['up', 'down']).describe('Scroll direction'),
  }),
  z.object({
    type: z.literal('executeJavascript'),
    script: z.string().describe('JavaScript code to execute'),
  }),
]);

// Scrape Schema
export const ScrapeSchema = z.object({
  url: z.string().describe('The URL to scrape'),
  formats: z.array(z.enum([
    'markdown',
    'html',
    'rawHtml',
    'screenshot',
    'links',
    'screenshot@fullPage',
  ])).optional().describe("Content formats to extract (default: ['markdown'])"),
  waitFor: z.number().optional().describe('Time in milliseconds to wait for dynamic content to load'),
  timeout: z.number().optional().describe('Maximum time in milliseconds to wait for the page to load'),
  skipTlsVerification: z.boolean().optional().describe('Skip TLS certificate verification'),
  actions: z.array(ActionSchema).optional().describe('List of supported actions to run before scraping'),
}).strict();

export type ScrapeInput = z.infer<typeof ScrapeSchema>;

// Extract Schema
export const ExtractSchema = z.object({
  urls: z.array(z.string()).describe('List of URLs to extract information from'),
}).strict();

export type ExtractInput = z.infer<typeof ExtractSchema>;
