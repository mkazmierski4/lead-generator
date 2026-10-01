import os

from fastapi import APIRouter

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/status")
def settings_status() -> dict[str, bool]:
    # Tylko informacja, czy klucz jest ustawiony -- nigdy sama wartość.
    return {
        "google_places": bool(os.environ.get("GOOGLE_PLACES_API_KEY")),
        "ceidg": bool(os.environ.get("CEIDG_API_KEY")),
        "smtp": bool(os.environ.get("SMTP_HOST")),
    }
