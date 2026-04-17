"""FastAPI backend for EarnSecure.
TODO : Replace the store with a real database and wire external APIs where marked.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, auth, claims, health, ivr, payments, policies, premium, riders
from app.scheduler import start_scheduler, stop_scheduler
from app.dependencies import get_store


@asynccontextmanager
async def lifespan(app: FastAPI):
	store = get_store()
	start_scheduler(store)
	yield
	stop_scheduler()

def create_app() -> FastAPI:
	app = FastAPI(title="EarnSecure API", version="0.1.0", lifespan=lifespan)
	app.add_middleware(
		CORSMiddleware,
		allow_origins=["*"],
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)

	app.include_router(health.router)
	app.include_router(auth.router)
	app.include_router(riders.router)
	app.include_router(premium.router)
	app.include_router(policies.router)
	app.include_router(claims.router)
	app.include_router(admin.router)
	app.include_router(payments.router)
	app.include_router(ivr.router)

	return app


app = create_app()


@app.get("/")
async def root() -> dict:
	return {"service": "earnsecure", "version": "0.1.0", "status": "live"}
