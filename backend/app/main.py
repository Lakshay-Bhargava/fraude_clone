from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.services.seed_data import seed_database_if_empty
from app.services.model_service import get_or_train_model

from app.api.auth import router as auth_router
from app.api.ads import router as ads_router
from app.api.dashboard import router as dashboard_router
from app.api.cases import router as cases_router
from app.api.network import router as network_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.settings import router as settings_router
from app.api.scanner import router as scanner_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Train or load ML baseline
    get_or_train_model()

    # Seed initial dataset if database is empty
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()

    yield
    # Shutdown logic if any

app = FastAPI(
    title="FraudScope AI API",
    version=settings.VERSION,
    description="AI-Powered Financial Advertisement Fraud Detection & Investigation Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/health")
def health_check():
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "online" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "Demonstration"
    }

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(ads_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(network_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(scanner_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
