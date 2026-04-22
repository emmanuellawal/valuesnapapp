import logging
import os
from typing import List, Optional, Sequence, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Application
    app_name: str = "ValueSnap API"
    admin_email: Optional[str] = None

    # Runtime toggles
    use_mock: bool = False
    cache_enabled: bool = True

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_debug: bool = True
    cors_origins: Union[str, List[str]] = Field(default_factory=list)

    # Security
    secret_key: Optional[str] = None
    jwt_secret: Optional[str] = None
    jwt_expiration_hours: Optional[int] = None

    # Rate limiting
    ratelimit_enabled: bool = True
    ratelimit_default: Optional[str] = None
    ratelimit_storage_url: Optional[str] = None

    # Database
    database_url: str = "sqlite:///valuesnap.db"

    # Supabase
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_key: Optional[str] = None

    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    openai_temperature: float = 0.0

    # eBay (Sandbox / Prod)
    ebay_sandbox_app_id: Optional[str] = None
    ebay_sandbox_cert_id: Optional[str] = None
    ebay_sandbox_dev_id: Optional[str] = None
    ebay_use_sandbox: bool = True
    ebay_oauth_redirect_uri: Optional[str] = None
    ebay_token_encryption_key: Optional[str] = None
    ebay_verification_token: Optional[str] = None
    ebay_prod_app_id: Optional[str] = None
    ebay_prod_cert_id: Optional[str] = None
    ebay_prod_dev_id: Optional[str] = None

    # eBay Cache
    ebay_cache_ttl_hours: int = 6  # Default 6 hours

    @field_validator('ebay_cache_ttl_hours')
    @classmethod
    def validate_cache_ttl(cls, v: int) -> int:
        if v < 1 or v > 24:
            raise ValueError("ebay_cache_ttl_hours must be between 1 and 24")
        return v

    # Logging
    log_level: str = "INFO"

    # Storage
    output_dir: str = "./integration_test_results"
    cache_dir: str = "./.cache"

    # Pricing
    default_fee_pct: float = 0.13
    storage_cost_per_month: float = 50
    dom_cap_days: int = 90

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


def parse_origins(origins: Union[str, Sequence[str], None]) -> List[str]:
    """Normalize CORS origins from CSV string or list."""
    if origins is None:
        return []
    if isinstance(origins, str):
        return [origin.strip() for origin in origins.split(",") if origin.strip()]
    return list(origins)


settings = Settings()
allowed_origins = parse_origins(settings.cors_origins)

if settings.use_mock:
    logger.info("USE_MOCK enabled: using mock services")
