from typing import Protocol

from .models import RawLead


class DiscoveryConnector(Protocol):
    """Wspólny interfejs źródeł leadów. Każde źródło implementuje tylko tę jedną metodę --
    geokodowanie, mapowanie branż itd. to szczegóły implementacyjne danego konektora."""

    source: str

    def search(self, country: str, city: str, industry: str) -> list[RawLead]: ...


class DiscoveryConfigError(RuntimeError):
    """Konektor nie jest skonfigurowany (np. brak klucza API) -- odróżniane od błędów sieciowych,
    żeby orchestrator mógł pominąć źródło zamiast wywalać cały discovery run."""
