import os
import json
from typing import List, Optional
from pydantic import BaseModel, Field

_db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../fraudscope.db")).replace("\\", "/")

DEV_SECRET_KEY = "fraudscope-ai-production-grade-secret-key-2026-finguard"

DEFAULT_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _normalize_database_url(raw_url: Optional[str]) -> str:
    """
    Normalizes database connection URLs:
    - Enforces the postgresql+psycopg2:// driver scheme for all PostgreSQL URLs
      to match the installed psycopg2-binary driver.
    - Handles Render URLs beginning with postgres:// and plain postgresql://.
    - Handles explicit postgresql+psycopg:// by converting to postgresql+psycopg2://.
    - Preserves valid sqlite:/// schemes for local development.
    - Safely defaults to local SQLite if unspecified.
    - Never logs database credentials.
    """
    if not raw_url or not raw_url.strip():
        return f"sqlite:///{_db_file}"
    url = raw_url.strip()

    # 1. Normalize explicit psycopg (v3) URL to installed psycopg2 driver
    if url.startswith("postgresql+psycopg://"):
        return "postgresql+psycopg2://" + url[len("postgresql+psycopg://"):]

    # 2. Normalize Render legacy postgres:// prefix
    if url.startswith("postgres://"):
        return "postgresql+psycopg2://" + url[len("postgres://"):]

    # 3. Normalize plain postgresql:// prefix (where SQLAlchemy 2.0 defaults to psycopg v3)
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://"):]

    return url


def _parse_cors_origins(env_cors: Optional[str], frontend_url: Optional[str], environment: str) -> List[str]:
    """
    Safely resolves allowed CORS origins:
    - Outside production: includes default localhost ports plus any custom configured origins.
    - In production: strictly includes explicitly provided FRONTEND_URL and CORS_ORIGINS.
    - Normalizes formatting and removes trailing slashes.
    - Does not trust arbitrary wildcard origins.
    """
    origins: List[str] = []
    seen: set = set()

    def add_origin(orig: str) -> None:
        cleaned = orig.strip().rstrip("/")
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            origins.append(cleaned)

    # 1. Parse CORS_ORIGINS (comma-separated or JSON array)
    if env_cors and env_cors.strip():
        raw_val = env_cors.strip()
        if raw_val.startswith("[") and raw_val.endswith("]"):
            try:
                parsed = json.loads(raw_val)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, str):
                            add_origin(item)
            except json.JSONDecodeError:
                for part in raw_val.strip("[]").split(","):
                    add_origin(part.strip('"\' '))
        else:
            for part in raw_val.split(","):
                add_origin(part)

    # 2. Parse dedicated FRONTEND_URL
    if frontend_url and frontend_url.strip():
        add_origin(frontend_url)

    # 3. Environment-aware defaults
    is_prod = environment.lower() == "production"
    if not is_prod:
        for dev_orig in DEFAULT_DEV_ORIGINS:
            add_origin(dev_orig)

    return origins


def _resolve_secret_key(env_secret: Optional[str], environment: str) -> str:
    """
    Validates authentication SECRET_KEY:
    - In production: mandates a strong, explicitly configured SECRET_KEY (min 32 chars).
    - In development/testing: allows standard development fallback.
    """
    is_prod = environment.lower() == "production"
    secret = (env_secret or "").strip()

    if is_prod:
        if not secret or secret == DEV_SECRET_KEY or len(secret) < 32:
            raise ValueError(
                "Production deployment error: A strong, unique SECRET_KEY environment variable "
                "(minimum 32 characters) must be configured when ENVIRONMENT=production. "
                "Do not use default or placeholder keys."
            )
        return secret

    return secret if secret else DEV_SECRET_KEY


class Settings(BaseModel):
    PROJECT_NAME: str = "FraudScope AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = f"sqlite:///{_db_file}"

    # Risk Scoring Thresholds
    RISK_THRESHOLD_LOW: int = 35
    RISK_THRESHOLD_HIGH: int = 65

    # Similarity Threshold (0.0 to 1.0)
    SIMILARITY_THRESHOLD: float = 0.78

    # Demo Mode
    DEMO_MODE: bool = True

    # Authentication
    SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    FRONTEND_URL: Optional[str] = None
    BACKEND_CORS_ORIGINS: List[str] = Field(default_factory=list)


def get_settings() -> Settings:
    env = os.getenv("ENVIRONMENT", "development").lower()
    raw_db = os.getenv("DATABASE_URL")
    normalized_db = _normalize_database_url(raw_db)
    secret_key = _resolve_secret_key(os.getenv("SECRET_KEY"), env)
    frontend_url = os.getenv("FRONTEND_URL")
    cors_origins = _parse_cors_origins(os.getenv("CORS_ORIGINS"), frontend_url, env)

    return Settings(
        ENVIRONMENT=env,
        DATABASE_URL=normalized_db,
        SECRET_KEY=secret_key,
        FRONTEND_URL=frontend_url.strip().rstrip("/") if frontend_url else None,
        BACKEND_CORS_ORIGINS=cors_origins,
        RISK_THRESHOLD_LOW=int(os.getenv("RISK_THRESHOLD_LOW", 35)),
        RISK_THRESHOLD_HIGH=int(os.getenv("RISK_THRESHOLD_HIGH", 65)),
        SIMILARITY_THRESHOLD=float(os.getenv("SIMILARITY_THRESHOLD", 0.78)),
        DEMO_MODE=os.getenv("DEMO_MODE", "true").lower() == "true",
    )


settings = get_settings()

