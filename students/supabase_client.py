from supabase import create_client
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize supabase client only if both URL and KEY are provided
if SUPABASE_URL and SUPABASE_KEY:
    try:
        # Validate URL format
        if SUPABASE_URL.startswith("https://") and ".supabase.co" in SUPABASE_URL:
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        else:
            logger.warning(f"Invalid SUPABASE_URL format: {SUPABASE_URL}")
            supabase = None
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    logger.warning(
        "Supabase credentials are missing! "
        "Set SUPABASE_URL and SUPABASE_KEY environment variables. "
        "Some features may not work."
    )
    supabase = None
