import base64
import os
import re
import unicodedata
from collections import Counter
from pathlib import Path

from google import genai

try:
    from secrets_local import GEMINI_API_KEY
except ImportError:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


BASE_DIR = Path(__file__).resolve().parent
PROMPT_PATH = BASE_DIR / "prompt.txt"
EXERCISES_PATH = BASE_DIR / "exercises.txt"
DESCRIPTIONS_PATH = BASE_DIR / "descriptions.txt"
OUTPUT_DIR = BASE_DIR / "pictograms"


def slugify(value):
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
    return slug or "exercise"


def read_lines(path):
    with path.open("r", encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


def build_prompt(template, exercise_name, exercise_description):
    return template.replace("[exercise-name]", exercise_name).replace(
        "[exercise-description]", exercise_description
    )


def extract_image_bytes(interaction):
    for step in interaction.steps:
        if step.type != "model_output" or not step.content:
            continue

        for part in step.content:
            if part.type == "image":
                return base64.b64decode(part.data)

    return None


def generate():
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "Hiányzó GEMINI_API_KEY. Add meg env var-ként vagy a tools/python-pipeline/secrets_local.py fájlban."
        )

    client = genai.Client(
        api_key=GEMINI_API_KEY,
    )

    generation_config = {
        "temperature": 1,
        "max_output_tokens": 65536,
        "top_p": 0.95,
        "thinking_level": "low",
    }

    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")
    exercises = read_lines(EXERCISES_PATH)
    descriptions = read_lines(DESCRIPTIONS_PATH)

    total = min(len(exercises), len(descriptions))
    if len(exercises) != len(descriptions):
        print(
            f"Figyelem: az exercises.txt ({len(exercises)}) és a descriptions.txt ({len(descriptions)}) hossza eltér, a közös elemek száma lesz feldolgozva: {total}."
        )

    OUTPUT_DIR.mkdir(exist_ok=True)

    name_counts = Counter(slugify(exercise) for exercise in exercises[:total])
    seen_counts = Counter()

    print(f"Kezdés: {total} képet fogok legenerálni a {OUTPUT_DIR.name} könyvtárba.")

    for index, (exercise_name, exercise_description) in enumerate(
        zip(exercises[:total], descriptions[:total]),
        start=1,
    ):
        base_name = slugify(exercise_name)
        seen_counts[base_name] += 1
        suffix = f"_{seen_counts[base_name]}" if name_counts[base_name] > 1 else ""
        filename = f"{base_name}{suffix}.png"
        output_path = OUTPUT_DIR / filename

        prompt = build_prompt(prompt_template, exercise_name, exercise_description)
        interaction = client.interactions.create(
            model="models/gemini-3.1-flash-lite-image",
            input=prompt,
            generation_config=generation_config,
            response_modalities=["image", "text"],
        )

        image_bytes = extract_image_bytes(interaction)
        if image_bytes is None:
            print(
                f"[{index}/{total}] Nem érkezett kép ehhez: {exercise_name}. {total - index} maradt hátra."
            )
            continue

        with output_path.open("wb") as image_file:
            image_file.write(image_bytes)

        remaining = total - index
        print(
            f"[{index}/{total}] Kész, {remaining} van hátra. Létrehozva: {output_path}"
        )


if __name__ == "__main__":
    generate()
