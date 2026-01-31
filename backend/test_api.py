#!/usr/bin/env python3
"""Test backend API endpoints"""
import requests
import json
import base64

# Test 1: Root endpoint
print("=" * 60)
print("TEST 1: Root endpoint")
print("=" * 60)
try:
    response = requests.get("http://localhost:5000/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 60)
print("TEST 2: Health endpoint")
print("=" * 60)
try:
    response = requests.get("http://localhost:5000/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 60)
print("TEST 3: Appraise endpoint (mock mode)")
print("=" * 60)
try:
    # Create a minimal base64 image (1x1 pixel transparent PNG)
    tiny_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    payload = {
        "image_base64": tiny_png
    }
    
    response = requests.post(
        "http://localhost:5000/api/appraise",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        print(f"\nIdentity: {json.dumps(result.get('identity', {}), indent=2)}")
        print(f"\nValuation: {json.dumps(result.get('valuation', {}), indent=2)}")
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 60)
print("TESTS COMPLETE")
print("=" * 60)
