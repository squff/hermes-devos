"""Hermes-DevOS - Main Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

from backend.api.routes import router
from backend.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-native Autonomous Software Engineering Platform"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup time
_start_time = time.time()

# Routes
app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "uptime": int(time.time() - _start_time)
    }
