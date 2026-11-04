#!/usr/bin/env python3
"""Descarga indicadores oficiales del SIE de Banxico y los guarda en data/indicators.json.
Necesita el secreto BANXICO_TOKEN (gratis en banxico.org.mx). Sin token, o si falla, no toca el archivo."""
import json, os, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "indicators.json"
URL = "https://www.banxico.org.mx/SieAPIRest/service/v1/series/{ids}/datos/oportuno"
# (id de serie, etiqueta, tipo, decimales). Revisa los títulos que imprime el script en el primer corrido.
SERIES = [
    ("SF43718", "Dólar (FIX)", "mxn", 4),
    ("SF43783", "TIIE 28 días", "pct", 4),
    ("SF282", "CETES 28 días", "pct", 2),
    ("SP68257", "UDI", "mxn", 6),
    ("SP30578", "Inflación anual", "pct", 2),
]


def parse(payload):
    """Devuelve {id: (titulo, fecha_iso, valor)} ignorando datos no disponibles (N/E)."""
    out = {}
    for s in payload.get("bmx", {}).get("series", []):
        datos = s.get("datos") or []
        if not datos:
            continue
        d = datos[-1]
        try:
            valor = float(str(d["dato"]).replace(",", ""))
            fecha = datetime.strptime(d["fecha"], "%d/%m/%Y").date().isoformat()
        except (KeyError, ValueError):
            continue
        out[s.get("idSerie")] = (s.get("titulo", ""), fecha, valor)
    return out


def main():
    token = os.environ.get("BANXICO_TOKEN", "").strip()
    if not token:
        print("Sin BANXICO_TOKEN: no se actualizan los indicadores.", file=sys.stderr)
        return 0
    ids = ",".join(s[0] for s in SERIES)
    req = urllib.request.Request(URL.format(ids=ids), headers={
        "Bmx-Token": token, "Accept": "application/json", "User-Agent": "PatotipzIndicatorsBot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            got = parse(json.load(r))
    except Exception as e:
        print(f"aviso: no se pudo consultar Banxico: {e}", file=sys.stderr)
        return 0
    items = []
    for sid, label, kind, dec in SERIES:
        if sid in got:
            titulo, fecha, valor = got[sid]
            print(f"{sid}: {titulo} = {valor} ({fecha})")
            items.append({"id": sid, "label": label, "kind": kind, "decimals": dec, "value": valor, "date": fecha, "title": titulo})
        else:
            print(f"{sid}: sin dato", file=sys.stderr)
    if not items:
        print("Banxico no devolvió datos; se conserva el archivo anterior.", file=sys.stderr)
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"updated": datetime.now(timezone.utc).isoformat(), "source": "Banco de México (SIE)", "items": items},
                              ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(items)} indicadores guardados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
