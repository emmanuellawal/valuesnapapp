"""Test Supabase cache connection"""
from backend.cache import get_supabase, get_cache_stats, write_cache, read_cache

print("Testing Supabase connection...")

try:
    # Test connection
    client = get_supabase()
    print("✅ Supabase client initialized")
    
    # Test cache stats
    stats = get_cache_stats()
    print(f"✅ Cache stats: {stats}")
    
    # Test write
    test_key = "test_connection_key"
    test_data = {"test": "data", "timestamp": "2026-01-31"}
    success = write_cache(test_key, test_data, 3600)
    print(f"✅ Cache write: {success}")
    
    # Test read
    cached = read_cache(test_key)
    print(f"✅ Cache read: {cached}")
    
    if cached == test_data:
        print("✅ ALL TESTS PASSED - Cache is working!")
    else:
        print(f"⚠️  Data mismatch: expected {test_data}, got {cached}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
