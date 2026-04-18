-- ============================================================================
-- ValueSnap Backend: Valuations Table Migration
-- ============================================================================
-- Story 3.1: Create Valuations Database Schema
-- This migration creates the valuations table for persistent valuation storage.
--
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com/project/YOUR_PROJECT_ID/editor
-- ============================================================================

-- Create valuations table
CREATE TABLE IF NOT EXISTS public.valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_session_id TEXT,
    image_thumbnail_url TEXT,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    brand TEXT NOT NULL,
    price_min NUMERIC(10,2),
    price_max NUMERIC(10,2),
    fair_market_value NUMERIC(10,2),
    confidence TEXT NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    sample_size INTEGER,
    ai_response JSONB,
    ebay_data JSONB,
    confidence_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_valuations_user_id
    ON public.valuations(user_id);

CREATE INDEX IF NOT EXISTS idx_valuations_created_at
    ON public.valuations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_valuations_user_created
    ON public.valuations(user_id, created_at DESC);

-- Partial index for guest claim path (Epic 4)
CREATE INDEX IF NOT EXISTS idx_valuations_guest_session
    ON public.valuations(guest_session_id)
    WHERE guest_session_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS makes this script safely re-runnable)
DROP POLICY IF EXISTS "Service role full access" ON public.valuations;
DROP POLICY IF EXISTS "Users can view own valuations" ON public.valuations;
DROP POLICY IF EXISTS "Users can insert own valuations" ON public.valuations;
DROP POLICY IF EXISTS "Users can delete own valuations" ON public.valuations;
DROP POLICY IF EXISTS "Users can claim guest valuations" ON public.valuations;

-- Service role has full access (used by backend for guest writes)
CREATE POLICY "Service role full access"
    ON public.valuations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view their own valuations
CREATE POLICY "Users can view own valuations"
    ON public.valuations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated users can insert their own valuations
CREATE POLICY "Users can insert own valuations"
    ON public.valuations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own valuations
CREATE POLICY "Users can delete own valuations"
    ON public.valuations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated users can claim unowned guest valuations into their own account.
-- The API still filters by guest_session_id; this policy ensures the updated row
-- must end up owned by the authenticated user.
CREATE POLICY "Users can claim guest valuations"
    ON public.valuations
    FOR UPDATE
    TO authenticated
    USING (user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

-- Column comments
COMMENT ON TABLE public.valuations IS 'Persistent storage for item valuations (Epic 3)';
COMMENT ON COLUMN public.valuations.id IS 'Unique valuation identifier';
COMMENT ON COLUMN public.valuations.user_id IS 'FK to auth.users, NULL for guest valuations';
COMMENT ON COLUMN public.valuations.guest_session_id IS 'Device UUID for guest valuations, used for Epic 4 account claim';
COMMENT ON COLUMN public.valuations.image_thumbnail_url IS 'Thumbnail URL (full image deleted per NFR-S6)';
COMMENT ON COLUMN public.valuations.item_name IS 'Display name: "{brand} {model}" or "{brand} {item_type}"';
COMMENT ON COLUMN public.valuations.item_type IS 'Item category from AI identification';
COMMENT ON COLUMN public.valuations.brand IS 'Brand name from AI identification';
COMMENT ON COLUMN public.valuations.price_min IS 'Low end of price range';
COMMENT ON COLUMN public.valuations.price_max IS 'High end of price range';
COMMENT ON COLUMN public.valuations.fair_market_value IS 'Median price estimate';
COMMENT ON COLUMN public.valuations.confidence IS 'Market confidence: HIGH, MEDIUM, or LOW';
COMMENT ON COLUMN public.valuations.sample_size IS 'Number of comparable sales analyzed';
COMMENT ON COLUMN public.valuations.ai_response IS 'Full AI identity response (JSONB)';
COMMENT ON COLUMN public.valuations.ebay_data IS 'Full eBay valuation response (JSONB)';
COMMENT ON COLUMN public.valuations.confidence_data IS 'Full confidence calculation response (JSONB)';
COMMENT ON COLUMN public.valuations.created_at IS 'Timestamp when valuation was created';
