from pathlib import Path
import json
import re

from openpyxl import load_workbook


BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_XLSX = BASE_DIR / "data-source" / "sia" / "_AIP_XML_SIA_AAAA-MM-JJ.xlsx"
OUTPUT_JSON = BASE_DIR / "public" / "data" / "frequencies-fr-sia.json"


FOUR_LETTER_IDENT_RE = re.compile(r"\b([A-Z]{4})\b")
BRACKET_IDENT_RE = re.compile(r"\[([A-Z0-9]{2})\]\[([A-Z0-9]{2})\]")
BRACKET_SINGLE_IDENT_RE = re.compile(r"\[([A-Z]{4})\]")
AD_2_IDENT_RE = re.compile(r"\bAD[-_.\s]*2[-_.\s]*([A-Z]{4})\b", re.IGNORECASE)
VAC_IDENT_RE = re.compile(r"\bVAC[-_.\s]*([A-Z]{4})\b", re.IGNORECASE)
AIRPORT_IDENT_IN_PATH_RE = re.compile(r"/([A-Z]{4})(?:/|\.|_|-|\b)")
TWO_LETTER_AD_CODE_RE = re.compile(r"\[[A-Z0-9]{2}\]\[([A-Z0-9]{2})\]")


def normalize_text(value):
    if value is None:
        return ""
    return str(value).strip()


def normalize_code(value):
    return normalize_text(value).upper()


def normalize_spaces(value):
    return re.sub(r"\s+", " ", normalize_text(value))


def to_float_or_none(value):
    text = normalize_text(value).replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except Exception:
        return None


def sheet_to_dicts(workbook, sheet_name):
    ws = workbook[sheet_name]
    rows = list(ws.iter_rows(values_only=True))

    if not rows:
        return []

    headers = [normalize_text(h) for h in rows[0]]

    records = []
    for row in rows[1:]:
        record = {}
        for idx, header in enumerate(headers):
            if not header:
                continue
            record[header] = row[idx] if idx < len(row) else None
        records.append(record)

    return records


def iter_link_values(row):
    for key, value in row.items():
        key_norm = normalize_text(key).lower()
        if key_norm.startswith("lk"):
            text = normalize_text(value)
            if text:
                yield text


def extract_bracket_airport_ident(text):
    text = normalize_text(text)
    match = BRACKET_IDENT_RE.search(text)
    if match:
        return f"{normalize_code(match.group(1))}{normalize_code(match.group(2))}"
    return ""


def extract_four_letter_ident(text):
    text = normalize_code(text)
    match = FOUR_LETTER_IDENT_RE.search(text)
    if match:
        return match.group(1)
    return ""


def extract_two_letter_ad_code(text):
    text = normalize_text(text)
    match = TWO_LETTER_AD_CODE_RE.search(text)
    if match:
        return normalize_code(match.group(1))
    return ""


def extract_airport_ident_candidates(text):
    text_norm = normalize_code(text)
    if not text_norm:
        return []

    candidates = []

    bracket_ident = extract_bracket_airport_ident(text_norm)
    if bracket_ident:
        candidates.append(bracket_ident)

    single_match = BRACKET_SINGLE_IDENT_RE.search(text_norm)
    if single_match:
        candidates.append(normalize_code(single_match.group(1)))

    for regex in [
        AD_2_IDENT_RE,
        VAC_IDENT_RE,
        AIRPORT_IDENT_IN_PATH_RE,
        FOUR_LETTER_IDENT_RE,
    ]:
        for match in regex.finditer(text_norm):
            ident = normalize_code(match.group(1))
            if len(ident) == 4:
                candidates.append(ident)

    seen = set()
    result = []
    for ident in candidates:
        if ident and ident not in seen:
            seen.add(ident)
            result.append(ident)
    return result


def first_non_empty(*values):
    for value in values:
        text = normalize_text(value)
        if text:
            return text
    return ""


def build_ad_index(ad_rows):
    index = {}
    ident_to_ad_code = {}

    for row in ad_rows:
        ad_code = normalize_code(
            first_non_empty(
                row.get("AdCode"),
                row.get("Code"),
                row.get("CodeAd"),
            )
        )
        if not ad_code:
            continue

        airport_ident = ""
        ident_candidates = []

        for value in row.values():
            ident_candidates.extend(extract_airport_ident_candidates(value))

        if ident_candidates:
            airport_ident = ident_candidates[0]

        airport_name = first_non_empty(
            row.get("AdNomComplet"),
            row.get("AdNomCarto"),
            row.get("Nom"),
        )

        entry = {
            "ad_code": ad_code,
            "airport_ident": airport_ident,
            "airport_name": airport_name,
            "airport_status": first_non_empty(
                row.get("AdStatut"),
                row.get("Statut"),
            ),
            "airport_situation": first_non_empty(
                row.get("AdSituation"),
                row.get("Situation"),
            ),
        }

        index[ad_code] = entry

        if airport_ident:
            ident_to_ad_code[airport_ident] = ad_code

    return index, ident_to_ad_code


def normalize_service_code(value):
    code = normalize_code(value)
    if code in {"A/A", "AA", "AUTO", "AUTO INFO", "AUTO-INFO"}:
        return "A/A"
    return code


def extract_service_airport_ident(service_row, ad_index, ident_to_ad_code):
    # 1. Liens explicites
    for value in iter_link_values(service_row):
        candidates = extract_airport_ident_candidates(value)
        if candidates:
            return candidates[0]

    # 2. Colonnes les plus probables
    for candidate in [
        service_row.get("IndicLieu"),
        service_row.get("IndicService"),
        service_row.get("Service"),
        service_row.get("Lieu"),
        service_row.get("Nom"),
    ]:
        candidates = extract_airport_ident_candidates(candidate)
        if candidates:
            return candidates[0]

    # 3. Balayage complet de la ligne
    for candidate in service_row.values():
        candidates = extract_airport_ident_candidates(candidate)
        if candidates:
            return candidates[0]

    # 4. Fallback via code terrain
    ad_code = normalize_code(
        first_non_empty(
            service_row.get("AdCode"),
            service_row.get("Code"),
            service_row.get("CodeAd"),
        )
    )

    if not ad_code:
        for value in iter_link_values(service_row):
            ad_code = extract_two_letter_ad_code(value)
            if ad_code:
                break

    if ad_code and ad_code in ad_index:
        return normalize_code(ad_index[ad_code].get("airport_ident"))

    # 5. Cas où le code complet est déjà présent
    if ad_code and len(ad_code) == 4 and ad_code in ident_to_ad_code:
        return ad_code

    return ""


def build_service_label(service_row):
    service_code = normalize_service_code(service_row.get("Service"))
    indic_lieu = normalize_spaces(service_row.get("IndicLieu"))
    indic_service = normalize_spaces(service_row.get("IndicService"))

    if indic_service == ".":
        indic_service = ""

    if service_code == "A/A":
        if indic_lieu:
            return f"Auto-information {indic_lieu}".strip()
        return "Auto-information"

    parts = [part for part in [service_code, indic_lieu, indic_service] if part]
    label = " ".join(parts).strip()

    if label:
        return label

    return service_code or "Fréquence"


def normalize_frequency_type(service_code):
    code = normalize_service_code(service_code)

    mapping = {
        "A/A": "air_to_air",
        "AFIS": "afis",
        "APP": "approach",
        "ATIS": "atis",
        "TWR": "tower",
        "GND": "ground",
        "SOL": "ground",
        "RAD": "radar",
        "FIS": "information",
        "INFO": "information",
        "ACC": "control",
        "ACS": "control",
        "DEP": "departure",
        "ARR": "arrival",
    }

    return mapping.get(code, "other")


def frequency_priority(entry):
    order = {
        "tower": 0,
        "afis": 1,
        "information": 2,
        "air_to_air": 3,
        "ground": 4,
        "approach": 5,
        "departure": 6,
        "arrival": 7,
        "atis": 8,
        "radar": 9,
        "control": 10,
        "other": 11,
    }

    return order.get(entry.get("frequency_type", "other"), 99)


def dedupe_frequencies(entries):
    seen = set()
    result = []

    for entry in entries:
        key = (
            normalize_code(entry.get("frequency_type")),
            normalize_spaces(entry.get("label")).upper(),
            entry.get("frequency_mhz"),
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(entry)

    return result


def main():
    if not INPUT_XLSX.exists():
        raise FileNotFoundError(f"Fichier source introuvable : {INPUT_XLSX}")

    workbook = load_workbook(INPUT_XLSX, read_only=True, data_only=True)

    required_sheets = ["FrequenceS", "ServiceS", "AdS"]
    for sheet_name in required_sheets:
        if sheet_name not in workbook.sheetnames:
            raise ValueError(f"Feuille manquante dans le fichier SIA : {sheet_name}")

    frequency_rows = sheet_to_dicts(workbook, "FrequenceS")
    service_rows = sheet_to_dicts(workbook, "ServiceS")
    ad_rows = sheet_to_dicts(workbook, "AdS")

    ad_index, ident_to_ad_code = build_ad_index(ad_rows)

    service_by_pk = {}
    unresolved_services = 0

    for row in service_rows:
        pk = row.get("pk")
        if pk is None:
            continue

        try:
            pk = int(pk)
        except Exception:
            continue

        airport_ident = extract_service_airport_ident(row, ad_index, ident_to_ad_code)
        if not airport_ident:
            unresolved_services += 1
            continue

        service_code = normalize_service_code(row.get("Service"))

        service_by_pk[pk] = {
            "pk": pk,
            "airport_ident": airport_ident,
            "service_code": service_code,
            "label": build_service_label(row),
            "indic_lieu": normalize_spaces(row.get("IndicLieu")),
            "indic_service": normalize_spaces(row.get("IndicService")),
            "language": normalize_text(row.get("Langue")),
        }

    grouped = {}

    for row in frequency_rows:
        service_pk = row.get("pk2")
        if service_pk is None:
            continue

        try:
            service_pk = int(service_pk)
        except Exception:
            continue

        service = service_by_pk.get(service_pk)
        if not service:
            continue

        frequency_mhz = to_float_or_none(row.get("Frequence"))
        if frequency_mhz is None:
            continue

        airport_ident = service["airport_ident"]
        ad_code = ident_to_ad_code.get(
            airport_ident,
            airport_ident[2:] if len(airport_ident) == 4 else "",
        )
        ad_info = ad_index.get(ad_code, {})

        frequency_entry = {
            "frequency_type": normalize_frequency_type(service["service_code"]),
            "service_code": service["service_code"],
            "label": service["label"],
            "frequency_mhz": round(frequency_mhz, 3),
            "hours_code": normalize_text(row.get("HorCode")),
            "hours_text": normalize_text(row.get("HorTxt")),
            "spacing": normalize_text(row.get("Espacement")),
            "remark": normalize_text(row.get("Remarque")),
            "sector": normalize_text(row.get("SecteurSituation")),
            "suppletive": normalize_text(row.get("Suppletive")),
            "language": service["language"],
        }

        if airport_ident not in grouped:
            grouped[airport_ident] = {
                "airport_ident": airport_ident,
                "weather_code": airport_ident if len(airport_ident) == 4 else "",
                "airport_name": ad_info.get("airport_name", ""),
                "airport_status": ad_info.get("airport_status", ""),
                "airport_situation": ad_info.get("airport_situation", ""),
                "source": "SIA XLSX",
                "frequencies": [],
            }

        grouped[airport_ident]["frequencies"].append(frequency_entry)

    result = []

    for airport_ident, item in grouped.items():
        frequencies = dedupe_frequencies(item["frequencies"])
        frequencies.sort(
            key=lambda entry: (
                frequency_priority(entry),
                entry.get("frequency_mhz", 9999),
                normalize_spaces(entry.get("label")).upper(),
            )
        )

        result.append(
            {
                **item,
                "frequencies": frequencies,
                "primary_frequency": frequencies[0] if frequencies else None,
            }
        )

    result.sort(key=lambda item: item["airport_ident"])

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Base fréquences SIA générée : {len(result)} terrains exportés")
    print(f"Services non rattachés à un terrain : {unresolved_services}")
    print(f"Fichier écrit : {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
