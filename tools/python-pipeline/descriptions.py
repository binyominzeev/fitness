import os

from google import genai
from google.genai import types

try:
    from secrets_local import GEMINI_API_KEY
except ImportError:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def generate_description(client, model, generate_content_config, exercise):
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(
                    text=f"""We're creating pictograms for various exercises. Please provide a short description for the following exercies: {exercise}. Go with the option Minimalist (Best for small icons/cards), give only the text as the output."""
                ),
            ],
        ),
    ]

    chunks = []
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if text := chunk.text:
            chunks.append(text)

    return "".join(chunks).strip()


def generate():
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "Hiányzó GEMINI_API_KEY. Add meg env var-ként vagy a tools/python-pipeline/secrets_local.py fájlban."
        )

    client = genai.Client(
        api_key=GEMINI_API_KEY,
    )

    model = "gemini-3.1-flash-lite"
    generate_content_config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="MINIMAL",
        ),
    )

    with open("exercises.txt", "r", encoding="utf-8") as exercises_file:
        exercises = [line.strip() for line in exercises_file if line.strip()]

    total = len(exercises)
    print(f"Összesen {total} feladat feldolgozása indul.")

    with open("descriptions.txt", "w", encoding="utf-8") as descriptions_file:
        for index, exercise in enumerate(exercises, start=1):
            description = generate_description(
                client,
                model,
                generate_content_config,
                exercise,
            )
            descriptions_file.write(description)
            if index < total:
                descriptions_file.write("\n")
            descriptions_file.flush()

            remaining = total - index
            print(
                f"[{index}/{total}] Kész, {remaining} van hátra. Létrehozva: {exercise} -> {description}"
            )


if __name__ == "__main__":
    generate()
