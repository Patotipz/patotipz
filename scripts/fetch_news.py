#!/usr/bin/env python3
"""Descarga titulares de economía de México (Google News RSS) y los guarda en data/news.json.
Solo usa la biblioteca estándar. Si no logra bajar nada, deja el archivo anterior intacto."""
import json, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "news.json"
QUERIES = [
    "economía México",
    "Banxico tasa de interés",
    "peso mexicano dólar tipo de cambio",
    "inflación México INEGI",
]
MAX_AGE_DAYS = 4
MAX_ITEMS = 16
UA = "Mozilla/5.0 (compatible; PatotipzNewsBot/1.0; +https://github.com)"


def feed_url(q):
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": q + f" when:{MAX_AGE_DAYS}d", "hl": "es-419", "gl": "MX", "ceid": "MX:es-419"})


def parse(xml_bytes):
    items = []
    root = ET.fromstring(xml_bytes)
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        pub = it.findtext("pubDate") or ""
        src = (it.findtext("source") or "").strip()
        if " - " in title:
            head, tail = title.rsplit(" - ", 1)
            title, src = head.strip(), (src or tail.strip())
        try:
            when = parsedate_to_datetime(pub).astimezone(timezone.utc)
        except Exception:
            continue
        if title and link.startswith("http"):
            items.append({"title": title, "source": src, "url": link, "published": when.isoformat()})
    return items


def main():
    all_items = []
    for q in QUERIES:
        try:
            req = urllib.request.Request(feed_url(q), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                all_items += parse(r.read())
        except Exception as e:  # una consulta fallida no detiene a las demás
            print(f"aviso: {q!r} falló: {e}", file=sys.stderr)
        time.sleep(1)
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    seen, fresh = set(), []
    for it in sorted(all_items, key=lambda x: x["published"], reverse=True):
        key = it["title"].lower()[:70]
        if key in seen or datetime.fromisoformat(it["published"]) < cutoff:
            continue
        seen.add(key)
        fresh.append(it)
    # evita que una sola fuente domine la lista
    per_src, picked = {}, []
    for it in fresh:
        n = per_src.get(it["source"], 0)
        if n < 3:
            picked.append(it)
            per_src[it["source"]] = n + 1
    picked = picked[:MAX_ITEMS]
    if len(picked) < 3:
        print("Muy pocos titulares; se conserva el archivo anterior.", file=sys.stderr)
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"updated": datetime.now(timezone.utc).isoformat(), "items": picked},
                              ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(picked)} titulares guardados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
