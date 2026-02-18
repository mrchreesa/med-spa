import base64
import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings

_cfg_logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Application
    app_env: str = "development"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/medspa"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    clerk_allowed_origins: list[str] = []

    @model_validator(mode="after")
    def _derive_jwks_url(self) -> "Settings":
        """Auto-derive clerk_jwks_url from clerk_publishable_key if not set."""
        if self.clerk_jwks_url or not self.clerk_publishable_key:
            return self
        try:
            # Format: pk_test_<base64url> or pk_live_<base64url>
            parts = self.clerk_publishable_key.split("_", 2)
            if len(parts) < 3:
                return self
            encoded = parts[2]
            # Add base64 padding
            padded = encoded + "=" * (-len(encoded) % 4)
            domain = base64.urlsafe_b64decode(padded).decode().rstrip("$")
            self.clerk_jwks_url = f"https://{domain}/.well-known/jwks.json"
            _cfg_logger.info("Derived JWKS URL from publishable key: %s", self.clerk_jwks_url)
        except Exception:
            _cfg_logger.warning("Failed to derive JWKS URL from publishable key")
        return self

    # OpenAI
    openai_api_key: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""

    # Retell AI
    retell_api_key: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Langfuse
    langfuse_host: str = "http://localhost:3001"
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Encryption
    aws_kms_key_id: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
