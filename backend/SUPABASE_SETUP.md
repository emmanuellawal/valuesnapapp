# Supabase Setup Guide

This guide walks you through setting up Supabase for the ValueSnap backend.

## What is Supabase Used For?

The backend uses Supabase PostgreSQL as a persistent cache layer for eBay market data. This:
- **Reduces API costs** by caching eBay search results
- **Improves response times** for repeated searches
- **Provides TTL-based expiration** for automatic cache invalidation

## Prerequisites

- A Supabase account (free tier works great!)
- Python 3.10+
- Backend dependencies installed: `pip install -r requirements.txt`

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/)
2. Click **"New Project"**
3. Choose an organization or create one
4. Configure your project:
   - **Name:** valuesnap-backend (or your preference)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** Free tier is sufficient for development

5. Click **"Create new project"** and wait 2-3 minutes for provisioning

## Step 2: Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **service_role key** (under "Service Role" section - this is secret!)

## Step 3: Configure Environment Variables

Add your credentials to `backend/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

⚠️ **Security Note:** 
- Never commit `.env` to version control
- The service_role key bypasses Row Level Security - keep it secret
- Use the anon key in mobile/frontend apps (not service_role)

## Step 4: Create the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of `backend/migrations/001_create_cache_table.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

You should see a success message like:
```
Success. No rows returned
```

### Verify Table Creation

Go to **Table Editor** in the sidebar. You should see:
- A new table called `cache`
- Columns: `key`, `value`, `ttl_seconds`, `created_at`, `expires_at`

## Step 5: Test the Connection

Run the test script from the project root:

```bash
cd backend
python test_cache_connection.py
```

Expected output:
```
Testing Supabase connection...
  client = get_supabase()
✅ Supabase client initialized

Testing cache operations...
✅ Test value written to cache
✅ Test value read from cache: {'test': 'data', 'timestamp': '...'}

Testing cache statistics...
✅ Cache stats retrieved: {'total_entries': 1, 'expired_entries': 0, 'active_entries': 1}

All tests passed! ✅
```

## Step 6: Enable Caching in Production

Once verified, enable caching in `.env`:

```bash
CACHE_ENABLED=true
# Optional: Adjust cache TTL (default: 6 hours)
EBAY_CACHE_TTL_HOURS=6
```

## Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured"

- Check that `.env` exists in the `backend/` directory
- Verify environment variables are set correctly
- Restart the backend server after changing `.env`

### Error: "relation 'public.cache' does not exist"

- Run the SQL migration from Step 4
- Verify you're connected to the correct Supabase project

### Error: "permission denied for table cache"

- Ensure you're using the `service_role` key (not the `anon` key)
- Check that RLS policies were created in the migration

### Cache writes succeed but reads fail

- Check that `expires_at` timestamps are in the future
- Verify your system clock is correct
- Run cleanup script: `python backend/cleanup_cache.py`

## Maintenance

### Clean Up Expired Cache Entries

Run periodically to free up storage:

```bash
python backend/cleanup_cache.py
```

Or set up a cron job / scheduled task.

### Monitor Cache Performance

Check cache statistics via the admin endpoint:

```bash
curl http://localhost:5000/admin/cache-stats
```

Response:
```json
{
  "total_entries": 42,
  "expired_entries": 5,
  "active_entries": 37
}
```

### Adjust Cache TTL

The default TTL is 6 hours. Adjust in `.env`:

```bash
# Shorter TTL = more fresh data, more API calls
EBAY_CACHE_TTL_HOURS=3

# Longer TTL = fewer API calls, potentially stale data
EBAY_CACHE_TTL_HOURS=24
```

## Production Deployment

### Environment Variables

Ensure these are set in your production environment:

```bash
CACHE_ENABLED=true
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_KEY=your-production-service-key
EBAY_CACHE_TTL_HOURS=6
```

### Database Backups

Supabase automatically backs up your database:
- Free tier: Daily backups, 7-day retention
- Pro tier: Configurable backup frequency and retention

Access backups: **Database** → **Backups**

### Monitoring

Set up alerts in Supabase dashboard:
1. Go to **Settings** → **Billing & Usage**
2. Monitor database size and API requests
3. Set up email alerts for quota thresholds

## Architecture Notes

### Cache Key Generation

Cache keys are SHA-256 hashes of:
- Item brand
- Item model
- Item type
- Search keywords (sorted)

This ensures:
- Deterministic cache lookups
- No collision risk
- Privacy (no PII in keys)

### Cache Invalidation

Entries are automatically expired based on TTL. The cache layer:
1. Checks `expires_at` on every read
2. Returns `None` for expired entries
3. Allows background cleanup via `cleanup_cache.py`

### Graceful Degradation

If Supabase is unavailable:
- Cache reads return `None` (cache miss)
- Cache writes fail silently
- Backend continues to work (slower, more API calls)
- Errors are logged but don't crash the app

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend logs: `tail -f backend/server.log`
3. Test with `USE_MOCK=true` to isolate issues
4. Open an issue on GitHub with logs and error details
