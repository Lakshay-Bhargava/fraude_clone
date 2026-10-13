import os
from pydantic import BaseModel

_db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../fraudscope.db")).replace("\\", "/")

class Settings(BaseModel):
    PROJECT_NAME: str = "FraudScope AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_db_file}")
    
    # Risk Scoring Thresholds
    RISK_THRESHOLD_LOW: int = 35
    RISK_THRESHOLD_HIGH: int = 65
    
    # Similarity Threshold (0.0 to 1.0)
    SIMILARITY_THRESHOLD: float = 0.78
    
    # Demo Mode
    DEMO_MODE: bool = True
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
