-- Migration: Add crawl queue support to data_sources
-- Enables background batch crawling for unlimited page counts

ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS crawl_queue   JSONB    DEFAULT '[]'::jsonb,   -- pending URLs to crawl
  ADD COLUMN IF NOT EXISTS crawled_urls  JSONB    DEFAULT '[]'::jsonb,   -- already visited URLs
  ADD COLUMN IF NOT EXISTS crawl_chars   INTEGER  DEFAULT 0,             -- accumulated character count
  ADD COLUMN IF NOT EXISTS char_limit    INTEGER  DEFAULT 2000000,       -- 2M char default ceiling
  ADD COLUMN IF NOT EXISTS pages_crawled INTEGER  DEFAULT 0;             -- how many pages indexed so far
