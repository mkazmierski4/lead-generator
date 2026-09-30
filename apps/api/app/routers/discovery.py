from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.discovery_service import run_discovery
from discovery.industries import INDUSTRIES

router = APIRouter(prefix="/discovery", tags=["discovery"])


class DiscoveryRunRequest(BaseModel):
    country: str
    city: str
    industry: str
    sources: list[str] = ["osm"]


class DiscoveryRunResponse(BaseModel):
    found: int
    created: int
    skipped_duplicate: int
    skipped_sources: list[str]


@router.get("/industries")
def list_industries() -> dict[str, str]:
    return {key: mapping.label_pl for key, mapping in INDUSTRIES.items()}


@router.post("/run", response_model=DiscoveryRunResponse)
def discovery_run(payload: DiscoveryRunRequest, db: Session = Depends(get_db)) -> DiscoveryRunResponse:
    if payload.industry not in INDUSTRIES:
        raise HTTPException(status_code=400, detail=f"Nieznana branża: {payload.industry}")

    unknown_sources = set(payload.sources) - {"osm", "google_places"}
    if unknown_sources:
        raise HTTPException(status_code=400, detail=f"Nieznane źródła: {sorted(unknown_sources)}")

    result = run_discovery(db, payload.country, payload.city, payload.industry, payload.sources)
    return DiscoveryRunResponse(
        found=result.found,
        created=result.created,
        skipped_duplicate=result.skipped_duplicate,
        skipped_sources=result.skipped_sources or [],
    )
