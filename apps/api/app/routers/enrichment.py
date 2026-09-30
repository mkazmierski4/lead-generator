from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.enrichment_service import run_enrichment

router = APIRouter(prefix="/enrichment", tags=["enrichment"])


class EnrichmentRunResponse(BaseModel):
    processed: int


@router.post("/run", response_model=EnrichmentRunResponse)
def enrichment_run(
    limit: int = Query(default=50, le=200), db: Session = Depends(get_db)
) -> EnrichmentRunResponse:
    result = run_enrichment(db, limit=limit)
    return EnrichmentRunResponse(processed=result.processed)
