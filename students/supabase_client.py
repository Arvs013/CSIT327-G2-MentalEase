from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Validate that environment variables are set
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "❌ Supabase credentials are missing!\n"
        "Please create a .env file in the project root with:\n"
        "SUPABASE_URL=https://<your-project>.supabase.co\n"
        "SUPABASE_KEY=<your-anon-key>\n\n"
        "Get your credentials from: https://app.supabase.com/project/_/settings/api"
    )

# Validate URL format
if not SUPABASE_URL.startswith("https://") or ".supabase.co" not in SUPABASE_URL:
    raise ValueError(
        f"❌ Invalid SUPABASE_URL format: {SUPABASE_URL}\n"
        "URL should be in format: https://<your-project>.supabase.co"
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
