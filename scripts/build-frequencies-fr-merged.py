from pathlib import Path
import json


BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_SIA = BASE_DIR / "public" / "data" / "frequencies-fr-sia.json"
INPUT_OURAIRPORTS = BASE_DIR / "public" / "data" / "frequencies-fr.json"
OUTPUT_JSON = BASE_DIR / "public" / "data" / "frequencies-fr-merged.json"


def normalize_text(value):
    if value is None:
        return ""
    return str(value).strip()


def normalize_code(value):
    return normalize_text(value).upper()


def load_json_array(path):
    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {path}")

    data = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(data, list):
        raise ValueError(f"Le fichier {path} ne contient pas une liste JSON.")

    return data


def get_airport_key(item):
    weather_code = normalize_code(item.get("weather_code"))
    airport_ident = normalize_code(item.get("airport_ident"))

    if len(weather_code) == 4:
        return weather_code

    if len(airport_ident) == 4:
        return airport_ident

    return ""


def normalize_frequency_entry(entry):
    return {
        "frequency_type": normalize_code(entry.get("frequency_type") or "").lower(),
        "service_code": normalize_code(entry.get("service_code") or ""),
        "label": normalize_text(entry.get("label") or entry.get("description") or "Fréquence"),
        "description": normalize_text(entry.get("description") or ""),
        "frequency_mhz": entry.get("frequency_mhz"),
        "hours_code": normalize_text(entry.get("hours_code") or ""),
        "hours_text": normalize_text(entry.get("hours_text") or ""),
        "spacing": normalize_text(entry.get("spacing") or ""),
        "remark": normalize_text(entry.get("remark") or ""),
        "sector": normalize_text(entry.get("sector") or ""),
        "suppletive": normalize_text(entry.get("suppletive") or ""),
        "language": normalize_text(entry.get("language") or ""),
    }


def dedupe_frequencies(entries):
    seen = set()
    result = []

    for entry in entries:
        normalized = normalize_frequency_entry(entry)

        key = (
            normalized["frequency_type"],
            normalized["label"],
            normalized["frequency_mhz"],
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(normalized)

    return result


def frequency_priority(entry):
    order = {
        "tower": 0,
        "afis": 1,
        "information": 2,
        "air_to_air": 3,
        "ctaf": 4,
        "unicom": 5,
        "ground": 6,
        "approach": 7,
        "departure": 8,
        "arrival": 9,
        "atis": 10,
        "radar": 11,
        "control": 12,
        "other": 13,
    }

    return order.get(entry.get("frequency_type", "other"), 99)


def normalize_record(item, source_name):
    frequencies = item.get("frequencies") or []
    frequencies = dedupe_frequencies(frequencies)
    frequencies.sort(
        key=lambda entry: (
            frequency_priority(entry),
            entry.get("frequency_mhz") if isinstance(entry.get("frequency_mhz"), (int, float)) else 9999,
            normalize_text(entry.get("label")),
        )
    )

    primary_frequency = item.get("primary_frequency")
    if not primary_frequency and frequencies:
        primary_frequency = frequencies[0]

    return {
        "airport_ident": normalize_code(item.get("airport_ident")),
        "weather_code": normalize_code(item.get("weather_code")),
        "airport_name": normalize_text(item.get("airport_name")),
        "airport_type": normalize_text(item.get("airport_type")),
        "airport_status": normalize_text(item.get("airport_status")),
        "airport_situation": normalize_text(item.get("airport_situation")),
        "municipality": normalize_text(item.get("municipality")),
        "region": normalize_text(item.get("region")),
        "source": source_name,
        "frequencies": frequencies,
        "primary_frequency": normalize_frequency_entry(primary_frequency) if primary_frequency else None,
    }


def merge_field(preferred, fallback):
    return normalize_text(preferred) or normalize_text(fallback)


def merge_records(sia_record, oa_record):
    if sia_record and sia_record["frequencies"]:
        base = sia_record
        fallback = oa_record
        source = "SIA primary + OurAirports fallback"
    else:
        base = oa_record
        fallback = sia_record
        source = "OurAirports fallback"

    if not base:
        return None

    merged_frequencies = []

    if sia_record and sia_record["frequencies"]:
        merged_frequencies.extend(sia_record["frequencies"])

    if oa_record and oa_record["frequencies"]:
        merged_frequencies.extend(oa_record["frequencies"])

    merged_frequencies = dedupe_frequencies(merged_frequencies)
    merged_frequencies.sort(
        key=lambda entry: (
            frequency_priority(entry),
            entry.get("frequency_mhz") if isinstance(entry.get("frequency_mhz"), (int, float)) else 9999,
            normalize_text(entry.get("label")),
        )
    )

    primary_frequency = None
    if sia_record and sia_record["primary_frequency"]:
        primary_frequency = sia_record["primary_frequency"]
    elif oa_record and oa_record["primary_frequency"]:
        primary_frequency = oa_record["primary_frequency"]
    elif merged_frequencies:
        primary_frequency = merged_frequencies[0]

    return {
        "airport_ident": merge_field(base.get("airport_ident"), fallback.get("airport_ident") if fallback else ""),
        "weather_code": merge_field(base.get("weather_code"), fallback.get("weather_code") if fallback else ""),
        "airport_name": merge_field(base.get("airport_name"), fallback.get("airport_name") if fallback else ""),
        "airport_type": merge_field(base.get("airport_type"), fallback.get("airport_type") if fallback else ""),
        "airport_status": merge_field(base.get("airport_status"), fallback.get("airport_status") if fallback else ""),
        "airport_situation": merge_field(base.get("airport_situation"), fallback.get("airport_situation") if fallback else ""),
        "municipality": merge_field(base.get("municipality"), fallback.get("municipality") if fallback else ""),
        "region": merge_field(base.get("region"), fallback.get("region") if fallback else ""),
        "source": source,
        "frequencies": merged_frequencies,
        "primary_frequency": primary_frequency,
    }


def main():
    sia_raw = load_json_array(INPUT_SIA)
    oa_raw = load_json_array(INPUT_OURAIRPORTS)

    sia_index = {}
    for item in sia_raw:
        normalized = normalize_record(item, "SIA")
        key = get_airport_key(normalized)
        if key:
            sia_index[key] = normalized

    oa_index = {}
    for item in oa_raw:
        normalized = normalize_record(item, "OurAirports")
        key = get_airport_key(normalized)
        if key:
            oa_index[key] = normalized

    all_keys = sorted(set(sia_index.keys()) | set(oa_index.keys()))

    merged = []
    count_sia_primary = 0
    count_oa_fallback = 0

    for key in all_keys:
        sia_record = sia_index.get(key)
        oa_record = oa_index.get(key)

        merged_record = merge_records(sia_record, oa_record)
        if not merged_record:
            continue

        if sia_record and sia_record["frequencies"]:
            count_sia_primary += 1
        else:
            count_oa_fallback += 1

        merged.append(merged_record)

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Base fréquences fusionnée générée : {len(merged)} terrains exportés")
    print(f"SIA primaire : {count_sia_primary}")
    print(f"OurAirports en secours : {count_oa_fallback}")
    print(f"Fichier écrit : {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
