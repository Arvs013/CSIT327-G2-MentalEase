"""
Diagnostic script to test Supabase connection.
Run this from the project root: python test_supabase_connection.py
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Load environment variables
env_path = BASE_DIR / '.env'
print(f"Looking for .env file at: {env_path}")
print(f"   File exists: {env_path.exists()}\n")

if not env_path.exists():
    print("ERROR: .env file not found!")
    print(f"   Please create a .env file at: {env_path}")
    print("\n   Contents should be:")
    print("   SUPABASE_URL=https://your-project-id.supabase.co")
    print("   SUPABASE_KEY=your-anon-key")
    sys.exit(1)

load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("Environment Variables Check:")
print(f"   SUPABASE_URL: {'[SET]' if SUPABASE_URL else '[MISSING]'}")
if SUPABASE_URL:
    # Show masked URL
    if len(SUPABASE_URL) > 35:
        masked_url = SUPABASE_URL[:20] + "..." + SUPABASE_URL[-15:]
    else:
        masked_url = SUPABASE_URL[:10] + "..." + SUPABASE_URL[-5:]
    print(f"   URL (masked): {masked_url}")
    print(f"   URL length: {len(SUPABASE_URL)} characters")
    print(f"   Starts with https://: {SUPABASE_URL.startswith('https://')}")
    print(f"   Contains .supabase.co: {'.supabase.co' in SUPABASE_URL}")
    
    # Check for common issues
    if SUPABASE_URL.strip() != SUPABASE_URL:
        print("   WARNING: URL has leading/trailing whitespace!")
    if ' ' in SUPABASE_URL:
        print("   WARNING: URL contains spaces!")
    if SUPABASE_URL.startswith('"') or SUPABASE_URL.startswith("'"):
        print("   WARNING: URL is wrapped in quotes!")

print(f"   SUPABASE_KEY: {'[SET]' if SUPABASE_KEY else '[MISSING]'}")
if SUPABASE_KEY:
    print(f"   Key length: {len(SUPABASE_KEY)} characters")
    if SUPABASE_KEY.strip() != SUPABASE_KEY:
        print("   WARNING: Key has leading/trailing whitespace!")

print("\n" + "="*60)

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n[ERROR] Missing Supabase credentials!")
    sys.exit(1)

# Strip whitespace
SUPABASE_URL = SUPABASE_URL.strip()
SUPABASE_KEY = SUPABASE_KEY.strip()

print("\nTesting Supabase Connection...")
print(f"   URL: {SUPABASE_URL}")

try:
    from supabase import create_client
    
    print("\n   1. Creating Supabase client...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("      [OK] Client created successfully")
    
    print("\n   2. Testing connection with a simple query...")
    # Try to query a table (this will fail if connection is bad, but won't error if table doesn't exist)
    try:
        # This is a simple test - just try to access the API
        response = supabase.table("students").select("id").limit(1).execute()
        print("      [OK] Connection successful! Can query Supabase.")
        print(f"      Response: {response}")
    except Exception as query_error:
        error_str = str(query_error)
        if "getaddrinfo failed" in error_str or "11001" in error_str:
            print("      [FAILED] DNS Resolution Failed!")
            print(f"      Error: {error_str}")
            print("\n   Possible causes:")
            print("      - Invalid Supabase URL (hostname doesn't exist)")
            print("      - Network connectivity issue")
            print("      - Firewall blocking connection")
            print("      - Supabase project is paused or deleted")
        elif "401" in error_str or "Unauthorized" in error_str:
            print("      [WARNING] Connection works but authentication failed!")
            print("      Check your SUPABASE_KEY")
        elif "relation" in error_str.lower() or "does not exist" in error_str.lower():
            print("      [OK] Connection successful! (Table doesn't exist yet, which is OK)")
        else:
            print(f"      [WARNING] Unexpected error: {error_str}")
            
except ImportError:
    print("      [ERROR] supabase package not installed!")
    print("      Run: pip install supabase")
    sys.exit(1)
except Exception as e:
    error_str = str(e)
    print(f"      [FAILED] Failed to create client!")
    print(f"      Error: {error_str}")
    
    if "getaddrinfo failed" in error_str or "11001" in error_str:
        print("\n   DNS Resolution Error Details:")
        print("      This means your computer cannot resolve the hostname in SUPABASE_URL")
        print("      Common issues:")
        print("      1. URL is incorrect (e.g., typo in project ID)")
        print("      2. Supabase project was deleted or paused")
        print("      3. Network/DNS issues")
        print("\n   Try this:")
        print("      - Verify your URL at: https://app.supabase.com")
        print("      - Check if your project is active (not paused)")
        print("      - Try accessing the URL in a browser")
    elif "Invalid URL" in error_str or "url" in error_str.lower():
        print("\n   URL Format Error:")
        print("      Your SUPABASE_URL format is incorrect")
        print("      Should be: https://xxxxx.supabase.co")
    else:
        print(f"\n   Error type: {type(e).__name__}")

print("\n" + "="*60)
print("\nDiagnostic complete!")

