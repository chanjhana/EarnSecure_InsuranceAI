# EarnSecure Backend

FastAPI-based backend for the EarnSecure parametric insurance platform. Provides REST APIs for rider onboarding, premium calculation, policy management, claims processing, and admin dashboards.

## Setup

1. Install dependencies: `pip install fastapi uvicorn pydantic`
2. Run the server: `uvicorn main:app --reload`
3. API docs available at `http://localhost:8000/docs`

## Architecture

- **Routers**: Modular endpoints in `app/routers/` mirroring frontend API clients in `src/api/`.
- **Schemas**: Pydantic models in `app/schemas.py` for request/response validation.
- **Storage**: In-memory demo store in `app/storage.py` (replace with real DB for production).
- **Dependencies**: Shared singletons in `app/dependencies.py`.

## Key Endpoints

- `/auth/send-otp`, `/auth/verify-otp`: OTP-based authentication.
- `/riders/link-platform`, `/riders/{rider_id}/profile`: Rider registration and profile updates.
- `/premium/calculate`: Dynamic premium computation with GBR + cohort blending.
- `/policies/activate`, `/policies/{rider_id}/current`: Policy lifecycle management.
- `/claims/{rider_id}`, `/claims/{claim_id}/detail`: Claims history and details.
- `/admin/portfolio`, `/admin/fraud-queue`, `/admin/claims/{claim_id}/approve|reject`: Admin operations.

## TODOs

- Integrate real OTP/SMS service (Twilio).
- Implement JWT authentication.
- Wire external APIs: OpenWeatherMap, CPCB, Downdetector, FSSAI, Razorpay.
- Replace in-memory store with PostgreSQL + Redis.
- Add async trigger monitoring and fraud detection pipelines.