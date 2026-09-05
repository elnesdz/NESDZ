import importlib.util
import json
from pathlib import Path
import unittest


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "build-frequencies-fr-sia.py"
)
SPEC = importlib.util.spec_from_file_location("build_frequencies_fr_sia", SCRIPT_PATH)
SIA = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SIA)


class SiaFrequencyParserTests(unittest.TestCase):
    def test_lowercase_bracket_link_is_normalized(self):
        self.assertEqual(SIA.extract_bracket_airport_ident("[lf][vm][AFIS]"), "LFVM")

    def test_airspace_label_is_not_treated_as_airport(self):
        ad_index = {
            "LFQQ": {"airport_ident": "LFQQ"},
            "NICE": {"airport_ident": "NICE"},
        }
        service = {
            "lk": "[LF][TMA NICE]",
            "IndicLieu": "NICE",
            "Service": "AFIS",
        }

        self.assertEqual(SIA.extract_service_airport_ident(service, ad_index), "")

    def test_service_link_resolves_real_airport(self):
        service = {"lk3": "[lf][qq][TWR]", "Service": "TWR"}

        self.assertEqual(SIA.extract_service_airport_ident(service, {}), "LFQQ")

    def test_short_codes_are_not_indexed_when_ambiguous(self):
        rows = [
            {
                "lk": "[LF][CZ]",
                "AdCode": "CZ",
                "AdNomComplet": "MIMIZAN",
            },
            {
                "lk": "[FM][CZ]",
                "AdCode": "CZ",
                "AdNomComplet": "DZAOUDZI PAMANDZI",
            },
        ]

        index = SIA.build_ad_index(rows)

        self.assertEqual(index["LFCZ"]["airport_name"], "MIMIZAN")
        self.assertEqual(index["FMCZ"]["airport_name"], "DZAOUDZI PAMANDZI")
        self.assertNotIn("CZ", index)

    def test_generated_sia_data_contains_only_real_airport_keys(self):
        data_path = SCRIPT_PATH.parents[1] / "public" / "data" / "frequencies-fr-sia.json"
        rows = json.loads(data_path.read_text(encoding="utf-8"))
        by_code = {row["airport_ident"]: row for row in rows}

        self.assertTrue({"AFIS", "EAST", "LFFF", "NICE", "TOUR", "WEST"}.isdisjoint(by_code))
        self.assertEqual(by_code["FMCZ"]["airport_name"], "DZAOUDZI PAMANDZI")
        self.assertEqual(by_code["LFCZ"]["airport_name"], "MIMIZAN")


if __name__ == "__main__":
    unittest.main()
