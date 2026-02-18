"""Langfuse singleton client for trace observability."""

import logging

from app.config import settings

logger = logging.getLogger(__name__)

_langfuse_instance = None


def get_langfuse():
    """Return the Langfuse client singleton, or None if not configured."""
    global _langfuse_instance

    if not settings.langfuse_enabled:
        return None

    if not settings.langfuse_public_key or not settings.langfuse_secret_key:
        return None

    if _langfuse_instance is not None:
        return _langfuse_instance

    try:
        from langfuse import Langfuse

        _langfuse_instance = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
        logger.info("Langfuse client initialized (host=%s)", settings.langfuse_host)
        return _langfuse_instance
    except Exception:
        logger.warning("Failed to initialize Langfuse client", exc_info=True)
        return None
