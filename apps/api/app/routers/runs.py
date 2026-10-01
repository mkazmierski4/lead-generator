from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.run import Run, RunKind
from app.schemas import RunOut

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("", response_model=list[RunOut])
def list_runs(
    kind: RunKind | None = Query(default=None),
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db),
) -> list[Run]:
    stmt = select(Run).order_by(Run.created_at.desc()).limit(limit)
    if kind:
        stmt = stmt.where(Run.kind == kind)
    return list(db.execute(stmt).scalars().all())
