from pydantic import BaseModel


class WebsiteCheckResult(BaseModel):
    status: str  # "dead" | "outdated" | "ok"
    reasons: list[str]


class EmailFindResult(BaseModel):
    email: str | None
    verified: bool  # True = znaleziony na stronie firmy, False = odgadnięty wzorzec
    reasons: list[str]
