#!/usr/bin/env python3
"""
Story 2-2 & 2-4: Test Real GPT-4o-mini + eBay API Integration

Tests:
1. GPT-4o-mini identifies a real product image
2. eBay API searches for market data
"""
import os
import sys
import json
import base64
import requests
from urllib.request import urlopen

# Ensure we're using real APIs (not mocks)
os.environ["USE_MOCK"] = "false"

API_BASE = "http://localhost:5000"

# Sample product image URLs for testing
TEST_IMAGES = {
    "canon_camera": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Canon_AE-1.jpg/640px-Canon_AE-1.jpg",
    "nintendo_switch": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/NintendoSwitch.png/640px-NintendoSwitch.png",
    "vintage_record": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/12in-Vinyl-LP-Record-Angle.jpg/640px-12in-Vinyl-LP-Record-Angle.jpg",
}

def download_and_encode_image(url: str) -> str:
    """Download image from URL and convert to base64"""
    print(f"   Downloading image from: {url[:60]}...")
    try:
        response = urlopen(url)
        image_data = response.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        print(f"   Image size: {len(image_data)} bytes, base64: {len(base64_image)} chars")
        return base64_image
    except Exception as e:
        print(f"   ERROR downloading: {e}")
        return None

def test_appraise(image_name: str, image_url: str):
    """Test the /api/appraise endpoint with a real image"""
    print(f"\n{'=' * 70}")
    print(f"TESTING: {image_name}")
    print('=' * 70)
    
    # Download and encode image
    base64_image = download_and_encode_image(image_url)
    if not base64_image:
        print("   SKIPPED - Could not download image")
        return None
    
    # Call API
    print(f"   Calling /api/appraise...")
    try:
        response = requests.post(
            f"{API_BASE}/api/appraise",
            json={"image_base64": base64_image},
            headers={"Content-Type": "application/json"},
            timeout=60  # GPT can take time
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            # Parse identity
            identity = result.get("identity", {})
            print(f"\n   📷 AI IDENTIFICATION:")
            print(f"      Item Type:  {identity.get('item_type', 'N/A')}")
            print(f"      Brand:      {identity.get('brand', 'N/A')}")
            print(f"      Model:      {identity.get('model', 'N/A')}")
            print(f"      Condition:  {identity.get('visual_condition', 'N/A')}")
            print(f"      Keywords:   {identity.get('search_keywords', [])}")
            
            # Parse valuation
            valuation = result.get("valuation", {})
            print(f"\n   💰 MARKET VALUATION:")
            print(f"      Status:      {valuation.get('status', 'N/A')}")
            print(f"      Total Found: {valuation.get('total_found', 0)}")
            
            if valuation.get('status') == 'success':
                price_range = valuation.get('price_range', {})
                print(f"      Price Range: ${price_range.get('min', 0):.2f} - ${price_range.get('max', 0):.2f}")
                print(f"      Fair Value:  ${valuation.get('fair_market_value', 0):.2f}")
                print(f"      Confidence:  {valuation.get('confidence', 'N/A')}")
            else:
                print(f"      Message:     {valuation.get('message', 'N/A')}")
                if valuation.get('error'):
                    print(f"      Error:       {valuation.get('error', 'N/A')}")
            
            return result
        else:
            print(f"   ERROR: {response.text[:500]}")
            return None
            
    except requests.exceptions.Timeout:
        print("   TIMEOUT - Request took too long (>60s)")
        return None
    except Exception as e:
        print(f"   ERROR: {e}")
        return None

def test_ebay_directly():
    """Test eBay API token generation directly"""
    print(f"\n{'=' * 70}")
    print("TESTING: eBay OAuth Token Generation")
    print('=' * 70)
    
    # Import eBay service
    sys.path.insert(0, '/home/elawa/projects/valuesnapapp')
    
    try:
        import asyncio
        from backend.services.ebay import get_ebay_token, search_sold_listings
        
        # Test token
        print("   Getting eBay OAuth token...")
        token = asyncio.run(get_ebay_token())
        print(f"   ✅ Token obtained: {token[:20]}...{token[-10:]}")
        
        # Test search
        print("\n   Testing eBay search for 'Canon AE-1 camera'...")
        result = asyncio.run(search_sold_listings("Canon AE-1 camera"))
        print(f"   Status: {result.get('status')}")
        print(f"   Total Found: {result.get('total_found', 0)}")
        
        if result.get('status') == 'success':
            print(f"   Price Range: ${result.get('price_range', {}).get('min', 0):.2f} - ${result.get('price_range', {}).get('max', 0):.2f}")
            print(f"   Fair Market Value: ${result.get('fair_market_value', 0):.2f}")
        else:
            print(f"   Message: {result.get('message', result.get('error', 'N/A'))}")
        
        return result
        
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print("\n" + "=" * 70)
    print("STORY 2-2 & 2-4: REAL API INTEGRATION TEST")
    print("=" * 70)
    print("\nThis test uses REAL APIs (GPT-4o-mini + eBay Sandbox)")
    print("Make sure USE_MOCK=false in the backend server\n")
    
    # Test 1: eBay token and search directly
    print("\n" + "#" * 70)
    print("# PART 1: eBay API Direct Test")
    print("#" * 70)
    ebay_result = test_ebay_directly()
    
    # Test 2: Full appraisal flow with Canon camera
    print("\n" + "#" * 70)
    print("# PART 2: Full Appraisal Flow (GPT + eBay)")
    print("#" * 70)
    
    # Just test one image to save API costs
    test_appraise("canon_camera", TEST_IMAGES["canon_camera"])
    
    print("\n" + "=" * 70)
    print("TESTS COMPLETE")
    print("=" * 70)
    
    print("\n📋 SUMMARY:")
    if ebay_result and ebay_result.get('status') in ['success', 'no_data']:
        print("   ✅ eBay API: Connected and working")
    else:
        print("   ❌ eBay API: Needs attention")
    
    print("\nNote: 'no_data' from eBay sandbox is EXPECTED - sandbox has limited listings")
    print("The important thing is that the API connection works without auth errors.")

if __name__ == "__main__":
    main()
