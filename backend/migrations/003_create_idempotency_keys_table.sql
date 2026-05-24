-- ============================================================================
-- ValueSnap Backend: Appraise Idempotency Key Store
-- ============================================================================
-- Story 6-13: Appraise Idempotency Key
--
-- Run this in Supabase SQL Editor after 002_create_valuations_table.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    principal_type TEXT NOT NULL CHECK (principal_type IN ('user', 'guest')),
    principal_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed')),
    status_code INTEGER NOT NULL DEFAULT 200,
    response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
    valuation_id UUID REFERENCES public.valuations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- One key per principal per endpoint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_scope_key
    ON public.idempotency_keys(endpoint, principal_type, principal_id, idempotency_key);

-- TTL lookup/cleanup support.
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
    ON public.idempotency_keys(expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.idempotency_keys;
CREATE POLICY "Service role full access"
    ON public.idempotency_keys
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.idempotency_keys IS 'Idempotency response store for POST /api/appraise';
COMMENT ON COLUMN public.idempotency_keys.endpoint IS 'Endpoint path, currently /api/appraise';
COMMENT ON COLUMN public.idempotency_keys.principal_type IS 'Scope partition: user or guest';
COMMENT ON COLUMN public.idempotency_keys.principal_id IS 'Authenticated user id, guest session id, or guest fallback principal';
COMMENT ON COLUMN public.idempotency_keys.idempotency_key IS 'Opaque client-generated idempotency key';
COMMENT ON COLUMN public.idempotency_keys.state IS 'Processing state for reservation-first idempotency flow';
COMMENT ON COLUMN public.idempotency_keys.status_code IS 'Original HTTP status returned for the request';
COMMENT ON COLUMN public.idempotency_keys.response_body IS 'Stable replay payload returned for this key';
COMMENT ON COLUMN public.idempotency_keys.valuation_id IS 'Created valuation id, if request persisted a valuation';
COMMENT ON COLUMN public.idempotency_keys.expires_at IS 'Replay record expiry timestamp (24h retention for Story 6-13)';
