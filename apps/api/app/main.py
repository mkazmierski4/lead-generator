from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import companies, discovery

app = FastAPI(title="Lead Generation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(discovery.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
