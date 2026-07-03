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
}).strict();

export type ScrapeInput = z.infer<typeof ScrapeSchema>;

// Extract Schema
export const ExtractSchema = z.object({
  urls: z.array(z.string()).describe('List of URLs to extract information from'),
}).strict();

export type ExtractInput = z.infer<typeof ExtractSchema>;
