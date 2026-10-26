"""Generate the three deterministic, synthetic sample files used by the app."""

import json
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "backend" / "app" / "samples"
WORDS = (
    "alpha bravo delta echo foxtrot gamma hotel india juliet kilo lima metro nova omega "
    "pixel quartz rocket sierra tango ultra vector willow xenon yankee zephyr"
).split()
CITIES = ["Austin", "Berlin", "Cairo", "Delhi", "Oslo", "Paris", "Quito", "Rome", "Seoul", "Tokyo"]
PLANS = ["free", "pro", "team", "enterprise"]


def api_response(rng: random.Random) -> str:
    items = []
    for i in range(6000):
        first, last = rng.choice(WORDS), rng.choice(WORDS)
        items.append(
            {
                "id": 100000 + i,
                "username": f"{first}_{last}{rng.randint(1, 999)}",
                "email": f"{first}.{last}@example.com",
                "plan": rng.choice(PLANS),
                "active": rng.random() > 0.2,
                "city": rng.choice(CITIES),
                "score": round(rng.uniform(0, 100), 3),
                "tags": rng.sample(WORDS, rng.randint(1, 4)),
                "created_at": f"2024-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}T"
                f"{rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}:00Z",
            }
        )
    return json.dumps({"status": "ok", "page": 1, "total": len(items), "data": items}, indent=2)


def server_log(rng: random.Random) -> str:
    paths = ["/", "/api/users", "/api/orders", "/static/app.js", "/static/app.css", "/login"]
    agents = ["Mozilla/5.0 (X11; Linux x86_64)", "curl/8.5.0", "Mozilla/5.0 (Macintosh)"]
    lines = []
    for i in range(14000):
        ip = f"10.{rng.randint(0, 3)}.{rng.randint(0, 255)}.{rng.randint(1, 254)}"
        lines.append(
            f"{ip} - - [12/Mar/2025:{(i // 600) % 24:02d}:{(i // 10) % 60:02d}:{i % 60:02d} +0000] "
            f'"{rng.choice(["GET", "GET", "GET", "POST"])} {rng.choice(paths)} HTTP/1.1" '
            f"{rng.choice([200, 200, 200, 304, 404, 500])} {rng.randint(120, 90000)} "
            f'"-" "{rng.choice(agents)}"'
        )
    return "\n".join(lines) + "\n"


def minified_js(rng: random.Random) -> str:
    parts = []
    for i in range(15000):
        a, b = rng.choice(WORDS), rng.choice(WORDS)
        parts.append(
            f"function {a[:3]}{i}(e,t){{var n=e.{a}||{rng.randint(0, 99)};"
            f'return t.{b}?n+t.{b}.length:"{b}-{i}"}}'
        )
        if i % 7 == 0:
            parts.append(f"window.{a}{i}={a[:3]}{i}(document,{{{b}:[{rng.randint(1, 9)}]}});")
    return "".join(parts)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn, seed in [
        ("api-response.json", api_response, 1),
        ("server.log", server_log, 2),
        ("app.min.js", minified_js, 3),
    ]:
        text = fn(random.Random(seed))
        (OUT / name).write_text(text)
        print(f"{name}: {len(text.encode()):,} bytes")


if __name__ == "__main__":
    main()
