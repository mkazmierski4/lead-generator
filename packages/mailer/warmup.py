from datetime import date

# Tydzień rozgrzewania skrzynki -> maksymalna liczba maili dziennie. Od 5. tygodnia obowiązuje
# skonfigurowany DAILY_SEND_LIMIT. Ostrożnie: nowa domena wysyłająca od razu 50 maili dziennie to
# najprostsza droga do spamu.
WARMUP_STEPS = [10, 15, 25, 35]


def daily_cap(today: date, warmup_start: date | None, configured_limit: int) -> int:
    if warmup_start is None or today < warmup_start:
        return min(WARMUP_STEPS[0], configured_limit)
    week = (today - warmup_start).days // 7
    if week < len(WARMUP_STEPS):
        return min(WARMUP_STEPS[week], configured_limit)
    return configured_limit
