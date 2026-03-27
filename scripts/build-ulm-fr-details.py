import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen


API_URL = "https://basulm.ffplum.fr/getbasulm/get/basulm/listall"
OUTPUT_PATH = Path("public/data/ulm-fr-details.json")


def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def normalize_for_match(value):
    text = clean_text(value) or ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.lower()


def to_int(value):
    text = clean_text(value)
    if not text:
        return None
    match = re.search(r"-?\d+", text.replace(",", "."))
    if not match:
        return None
    try:
        return int(match.group(0))
    except ValueError:
        return None


def parse_altitude_ft(value):
    return to_int(value)


def parse_dms(value):
    text = clean_text(value)
    if not text:
        return None

    match = re.match(
        r"^\s*([NSEW])\s*(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:[.,]\d+)?)\s*$",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None

    hemi, deg, minute, second = match.groups()
    deg = float(deg)
    minute = float(minute)
    second = float(second.replace(",", "."))

    decimal = deg + (minute / 60.0) + (second / 3600.0)
    if hemi.upper() in ("S", "W"):
        decimal = -decimal

    return round(decimal, 6)


def detect_platform_type(type_terrain):
    haystack = normalize_for_match(type_terrain)

    if "altisurface" in haystack:
        return "altisurface"
    if "hydrosurface" in haystack:
        return "hydrosurface"
    if "helistation" in haystack:
        return "helistation"
    if "aerodrome" in haystack or "aérodrome" in haystack:
        return "aerodrome"
    if "base ulm" in haystack:
        return "base_ulm"

    return "unknown"


def detect_access_tags(type_terrain, consignes):
    haystack = normalize_for_match(f"{type_terrain or ''} {consignes or ''}")
    tags = []

    if "prive" in haystack or "privé" in haystack:
        tags.append("private")
    if "autorisation obligatoire" in haystack:
        tags.append("authorization_required")
    if "ouvert aux ulm" in haystack or "ouverte tous types" in haystack:
        tags.append("open_to_ulm")
    if "restriction" in haystack or "restreint" in haystack:
        tags.append("restricted")
    if "fermee definitivement" in haystack or "fermée définitivement" in haystack:
        tags.append("closed_permanently")

    # dédoublonnage
    return list(dict.fromkeys(tags))


def detect_operational_label(platform_type, access_tags):
    if platform_type == "aerodrome" and "open_to_ulm" in access_tags:
        return "Aérodrome ouvert aux ULM"
    if platform_type == "aerodrome":
        return "Aérodrome"
    if platform_type == "base_ulm":
        return "Base ULM"
    if platform_type == "altisurface":
        return "Altisurface"
    if platform_type == "hydrosurface":
        return "Hydrosurface"
    if platform_type == "helistation":
        return "Hélistation"
    return "Plateforme spécifique"


def parse_runways(raw):
    runways = []

    for idx in (1, 2):
        surface = clean_text(raw.get(f"nature_piste_{idx}"))
        width = to_int(raw.get(f"largeur_piste_{idx}"))
        length = to_int(raw.get(f"longueur_piste_{idx}"))
        orientation = clean_text(raw.get(f"orientation_piste_{idx}"))
        preferred = clean_text(raw.get(f"orientation_pref_{idx}"))

        if not any([surface, width, length, orientation, preferred]):
            continue

        ident = None
        if orientation and normalize_for_match(orientation) != "inconnue":
            ident = orientation.replace("-", "/").replace(" ", "")

        runways.append(
            {
                "ident": ident,
                "orientation_raw": orientation,
                "preferred_orientation_raw": preferred,
                "surface": surface,
                "length_m": length,
                "width_m": width,
            }
        )

    return runways


def parse_classes(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    text = clean_text(value)
    if not text:
        return []
    return [part.strip() for part in str(text).split(",") if part.strip()]


def fetch_basulm_listall():
    api_key = os.environ.get("BASULM_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "La variable d'environnement BASULM_API_KEY est absente ou vide."
        )

    user_agent = (
        os.environ.get("BASULM_USER_AGENT", "").strip()
        or "NESDZ-BASULM-Importer/1.0"
    )

    request = Request(
        API_URL,
        headers={
            "Authorization": f"api_key {api_key}",
            "User-Agent": user_agent,
            "Accept": "application/json",
        },
        method="GET",
    )

    with urlopen(request, timeout=60) as response:
        body = response.read().decode("utf-8")

    payload = json.loads(body)

    if payload.get("status") != "ok":
        raise RuntimeError(
            f"Réponse BASULM refusée : {payload.get('error_code')} / {payload.get('error_description')}"
        )

    entries = payload.get("liste")
    if not isinstance(entries, list):
        raise RuntimeError("Réponse BASULM invalide : champ 'liste' absent ou incorrect.")

    return entries


def transform_entry(raw):
    code = clean_text(raw.get("code_terrain"))
    if not code:
        return None

    type_terrain = clean_text(raw.get("type_terrain"))
    consignes = clean_text(raw.get("consignes"))
    access_tags = detect_access_tags(type_terrain, consignes)
    platform_type = detect_platform_type(type_terrain)

    item = {
        "source": "basulm_api",
        "source_api_url": f"https://basulm.ffplum.fr/getbasulm/get/basulm/getByCode?code={code}",
        "source_public_pdf_url": f"https://basulm.ffplum.fr/PDF/{code}.pdf",
        "updated_at": clean_text(raw.get("date_modif")),
        "code": code,
        "name": clean_text(raw.get("toponyme")),
        "type_terrain_raw": type_terrain,
        "platform_type": platform_type,
        "operational_label": detect_operational_label(platform_type, access_tags),
        "access_tags": access_tags,
        "latitude": parse_dms(raw.get("latitude")),
        "longitude": parse_dms(raw.get("longitude")),
        "altitude_ft": parse_altitude_ft(raw.get("altitude")),
        "country": clean_text(raw.get("pays")),
        "region": clean_text(raw.get("region")),
        "department": clean_text(raw.get("departement")),
        "city": clean_text(raw.get("ville_postale")) or clean_text(raw.get("ville")),
        "postal_code": clean_text(raw.get("code_postal")),
        "address": clean_text(raw.get("adresse_postale")),
        "radio": {
            "documented": bool(clean_text(raw.get("radio"))),
            "value": clean_text(raw.get("radio")),
        },
        "runways": parse_runways(raw),
        "runway_count_reported": to_int(raw.get("nb_pistes")),
        "classes": parse_classes(raw.get("classes")),
        "contact": {
            "name": clean_text(raw.get("nom_contact")),
            "phone_1": clean_text(raw.get("tel_contact_1")),
            "phone_2": clean_text(raw.get("tel_contact_2")),
            "email": clean_text(raw.get("mail_contact")),
            "website": clean_text(raw.get("site_web")),
            "manager": clean_text(raw.get("gestionnaire")),
        },
        "services": {
            "facilities": clean_text(raw.get("facilities")),
            "fuel": clean_text(raw.get("carburant")),
        },
        "notes": {
            "consignes": consignes,
            "infos": clean_text(raw.get("infos")),
        },
        "official_check_required": True,
    }

    return item


def main():
    entries = fetch_basulm_listall()
    items = []

    for raw in entries:
        item = transform_entry(raw)
        if item:
            items.append(item)

    items.sort(key=lambda x: x["code"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"{len(items)} bases ULM détaillées écrites dans {OUTPUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Erreur build-ulm-fr-details: {exc}", file=sys.stderr)
        sys.exit(1)
