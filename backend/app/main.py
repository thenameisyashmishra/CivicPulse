from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.ratelimit import RateLimitMiddleware

from app.core.config import get_settings
from app.core.logging import setup_structured_logging
from app.db.database import Base, engine
from app.api import auth, dashboard, evidence, map, projects, reports, reviews, votes

setup_structured_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Zero-setup on SQLite: tables are created automatically. Swapping
    # DATABASE_URL to Postgres works the same way for a first run; for
    # schema changes after that, introduce Alembic migrations.
    Base.metadata.create_all(bind=engine)
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "REST API for the AI-Based Public Works Monitoring & Verification System. "
        "Handles projects, geotagged evidence uploads with AI verification "
        "(GPS/EXIF check, duplicate detection, quality/completion heuristics), "
        "citizen voting, and the Pradhan -> Engineer -> Admin approval chain."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(evidence.router)
app.include_router(votes.router)
app.include_router(reviews.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(map.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": settings.app_name}
