-- ============================================================================
-- ValueSnap Backend: Cache Table Migration
-- ============================================================================
-- This migration creates the cache table for storing eBay market data results
-- to reduce API calls and improve response times.
--
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com/project/YOUR_PROJECT_ID/editor
-- ============================================================================

-- Create cache table
CREATE TABLE IF NOT EXISTS public.cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON public.cache(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
-- (service_role bypasses RLS by default, but explicit policy is clearer)
CREATE POLICY "Service role has full access to cache"
ON public.cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Create policy for authenticated users (if needed for future features)
-- CREATE POLICY "Authenticated users can read cache"
-- ON public.cache
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.cache IS 'Persistent cache for eBay market data with TTL-based expiration';
COMMENT ON COLUMN public.cache.key IS 'SHA-256 hash of item identity (brand, model, keywords)';
COMMENT ON COLUMN public.cache.value IS 'Cached market data from eBay API';
COMMENT ON COLUMN public.cache.ttl_seconds IS 'Time-to-live in seconds';
COMMENT ON COLUMN public.cache.created_at IS 'Timestamp when cache entry was created';
COMMENT ON COLUMN public.cache.expires_at IS 'Timestamp when cache entry expires';
