#!/usr/bin/env python3
"""
Cache cleanup CLI script for eBay market data cache.

This script removes expired cache entries from the Supabase cache table.
Run this manually or schedule it via cron/systemd timer for regular cleanup.

Usage:
    python cleanup_cache.py [--dry-run] [--stats]

Options:
    --dry-run   Show what would be deleted without actually deleting
    --stats     Show cache statistics (total/expired/active entries)
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.cache import cleanup_expired_cache, get_cache_stats

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main entry point for cache cleanup script."""
    parser = argparse.ArgumentParser(
        description="Clean up expired entries from eBay market data cache"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be deleted without actually deleting'
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help='Show cache statistics (total/expired/active entries)'
    )
    
    args = parser.parse_args()
    
    logger.info("Starting cache cleanup at %s", datetime.now().isoformat())
    
    # Show statistics if requested
    if args.stats:
        logger.info("Fetching cache statistics...")
        stats = get_cache_stats()  # Sync function, no await
        if stats and 'error' not in stats:
            logger.info("=== Cache Statistics ===")
            logger.info("Total entries: %d", stats.get('total_entries', 0))
            logger.info("Expired entries: %d", stats.get('expired_entries', 0))
            logger.info("Active entries: %d", stats.get('active_entries', 0))
            logger.info("=" * 26)
        else:
            logger.error("Failed to fetch cache statistics: %s", stats.get('error', 'unknown'))
            return 1
    
    # Perform cleanup (or dry run)
    if args.dry_run:
        logger.info("DRY RUN MODE: No entries will be deleted")
        stats = get_cache_stats()  # Sync function, no await
        if stats and 'error' not in stats:
            expired_count = stats.get('expired_entries', 0)
            logger.info("Would delete %d expired entries", expired_count)
        else:
            logger.error("Failed to check expired entries")
            return 1
    else:
        logger.info("Cleaning up expired cache entries...")
        deleted_count = cleanup_expired_cache()  # Sync function, no await
        if deleted_count >= 0:
            logger.info("Successfully deleted %d expired entries", deleted_count)
        else:
            logger.error("Cache cleanup failed")
            return 1
    
    logger.info("Cache cleanup completed at %s", datetime.now().isoformat())
    return 0


if __name__ == '__main__':
    exit_code = main()
    exit(exit_code)
