import json
import re
import unicodedata
from collections import Counter
from collections import defaultdict
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
EXERCISES_PATH = BASE_DIR / "exercises.txt"
DESCRIPTIONS_PATH = BASE_DIR / "descriptions.txt"
GYAKORLATOK_MD_PATH = BASE_DIR / "gyakorlatok.md"
PICTOGRAMS_DIR = BASE_DIR / "pictograms"
OUTPUT_JSON_PATH = BASE_DIR / "exercise_database.json"


def slugify(value):
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
    return slug or "exercise"


def read_non_empty_lines(path):
    with path.open("r", encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


def normalize_name(value):
    return re.sub(r"\s+", " ", value).strip().casefold()


def clean_markdown_cell(value):
    cleaned = value.strip()
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    return cleaned.strip()


def is_markdown_separator(cell):
    stripped = cell.replace(":", "").replace("-", "").strip()
    return stripped == ""


def read_gyakorlatok_metadata(path):
    with path.open("r", encoding="utf-8") as handle:
        lines = handle.readlines()

    current_group = ""
    entries = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("#"):
            current_group = re.sub(r"^#+\s*", "", line).strip()
            continue

        if not line.startswith("|"):
            continue

        cells = [clean_markdown_cell(cell) for cell in line.strip("|").split("|")]
        if len(cells) < 2:
            continue

        magyar_name = cells[0]
        english_name = cells[1]

        if normalize_name(magyar_name) == "magyar" and normalize_name(english_name) == "english":
            continue

        if is_markdown_separator(magyar_name) and is_markdown_separator(english_name):
            continue

        entries.append(
            {
                "group": current_group,
                "exercise_name_hu": magyar_name,
                "exercise_name_en": english_name,
            }
        )

    return entries


def build_records(exercises, descriptions, gyakorlatok_metadata):
    total = min(len(exercises), len(descriptions))
    if len(exercises) != len(descriptions):
        print(
            f"Figyelem: exercises={len(exercises)}, descriptions={len(descriptions)}. Feldolgozva: {total}."
        )

    metadata_by_english = defaultdict(list)
    for item in gyakorlatok_metadata:
        key = normalize_name(item["exercise_name_en"])
        metadata_by_english[key].append(item)

    metadata_seen = Counter()

    name_counts = Counter(slugify(exercise) for exercise in exercises[:total])
    seen_counts = Counter()

    records = []
    print(f"Kezdes: {total} rekord epul.")

    for index, (exercise_name, exercise_description) in enumerate(
        zip(exercises[:total], descriptions[:total]),
        start=1,
    ):
        base_name = slugify(exercise_name)
        seen_counts[base_name] += 1
        suffix = f"_{seen_counts[base_name]}" if name_counts[base_name] > 1 else ""
        image_filename = f"{base_name}{suffix}.png"

        english_key = normalize_name(exercise_name)
        occurrence_index = metadata_seen[english_key]
        metadata_seen[english_key] += 1

        hungarian_name = ""
        group_name = ""
        candidates = metadata_by_english.get(english_key, [])
        if occurrence_index < len(candidates):
            metadata_item = candidates[occurrence_index]
            hungarian_name = metadata_item["exercise_name_hu"]
            group_name = metadata_item["group"]
        else:
            print(
                f"[{index}/{total}] Nem talaltam gyakorlatok.md megfeleltetest ehhez: {exercise_name}"
            )

        image_path = PICTOGRAMS_DIR / image_filename
        if not image_path.exists():
            print(
                f"[{index}/{total}] Hianyzo kepfajl: {image_filename}. Record ettol fuggetlenul bekerul."
            )

        records.append(
            {
                "exercise_name": exercise_name,
                "exercise_name_hu": hungarian_name,
                "group": group_name,
                "description": exercise_description,
                "image_file": image_filename,
            }
        )

        remaining = total - index
        print(f"[{index}/{total}] Kesz, {remaining} hatra.")

    return records


def main():
    exercises = read_non_empty_lines(EXERCISES_PATH)
    descriptions = read_non_empty_lines(DESCRIPTIONS_PATH)
    gyakorlatok_metadata = read_gyakorlatok_metadata(GYAKORLATOK_MD_PATH)

    print(f"gyakorlatok.md beolvasva: {len(gyakorlatok_metadata)} sor")

    records = build_records(exercises, descriptions, gyakorlatok_metadata)

    with OUTPUT_JSON_PATH.open("w", encoding="utf-8") as handle:
        json.dump(records, handle, ensure_ascii=False, indent=2)

    print(f"JSON kesz: {OUTPUT_JSON_PATH}")


if __name__ == "__main__":
    main()
