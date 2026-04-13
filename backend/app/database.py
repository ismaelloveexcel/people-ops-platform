from supabase import create_client, Client
from app.config import get_settings
from functools import lru_cache

settings = get_settings()


@lru_cache()
def get_supabase() -> Client:
    """
    Returns a Supabase client using the SERVICE ROLE key.
    This is used server-side only — bypasses RLS for admin operations.
    RLS is still enforced by passing the user's JWT where appropriate.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_user_client(access_token: str) -> Client:
    """
    Returns a Supabase client authenticated as the calling user.
    RLS policies are enforced with this client.
    """
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.auth.set_session(access_token, "")
    return client
