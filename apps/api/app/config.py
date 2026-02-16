from pydantic_settings import BaseSettings


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

    # OpenAI (dev embeddings only)
    openai_api_key: str = ""

    # Anthropic (dev LLM only)
    anthropic_api_key: str = ""

    # AWS Bedrock
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    bedrock_model_id_fast: str = "anthropic.claude-3-5-haiku-20241022-v1:0"
    bedrock_model_id_smart: str = "anthropic.claude-sonnet-4-20250514-v1:0"

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
