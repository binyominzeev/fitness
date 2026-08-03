import json
import re
import shutil
from collections import Counter, OrderedDict, deque
from pathlib import Path

from PIL import Image


BASE_DIR = Path(__file__).resolve().parent
INPUT_JSON_PATH = BASE_DIR / "exercise_database.json"
OUTPUT_HU_PATH = BASE_DIR / "exercises_hu.html"
OUTPUT_EN_PATH = BASE_DIR / "exercises_en.html"
PICTOGRAMS_DIR = BASE_DIR / "pictograms"
PICTOGRAMS_WHITE_DIR = BASE_DIR / "pictograms_white"


def parse_group_labels(raw_group):
    group = raw_group.strip()
    group = re.sub(r"^\d+\.\s*", "", group)

    match = re.match(r"^(.*?)\s*\((.*?)\)\s*$", group)
    if match:
        hu = match.group(1).strip()
        en = match.group(2).strip()
        return hu, en

    if "/" in group:
        left, right = [part.strip() for part in group.split("/", 1)]
        if left and right:
            return right, left

    return group, group


def escape_html(value):
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def card_html(item, language, image_subdir):
    image_file = item.get("image_file", "")
    image_src = f"{image_subdir}/{image_file}" if image_file else ""

    name_en = item.get("exercise_name", "")
    name_hu = item.get("exercise_name_hu", "") or name_en

    description_en = item.get("description_en") or item.get("description", "")
    description_hu = item.get("description_hu") or item.get("description", "")

    if language == "hu":
        title = name_hu
        description = description_hu
    else:
        title = name_en
        description = description_en

    return f"""
      <article class=\"card\">
        <div class=\"icon-wrap\">
          <img src=\"{escape_html(image_src)}\" alt=\"{escape_html(title)}\" loading=\"lazy\" />
        </div>
        <h3>{escape_html(title)}</h3>
        <p>{escape_html(description)}</p>
      </article>
    """.strip()


def build_grouped_data(records):
    grouped = OrderedDict()

    for item in records:
        raw_group = item.get("group", "")
        hu_group, en_group = parse_group_labels(raw_group)

        if raw_group not in grouped:
            grouped[raw_group] = {
                "hu": hu_group,
                "en": en_group,
                "items": [],
            }

        grouped[raw_group]["items"].append(item)

    return grouped


def _is_similar_rgb(rgb, reference_rgb, tolerance=26):
    return (
        max(
            abs(rgb[0] - reference_rgb[0]),
            abs(rgb[1] - reference_rgb[1]),
            abs(rgb[2] - reference_rgb[2]),
        )
        <= tolerance
    )


def make_white_background_copy(source_path, destination_path):
    with Image.open(source_path).convert("RGBA") as image:
        width, height = image.size
        pixels = image.load()

        corner_rgbs = [
            pixels[0, 0][:3],
            pixels[width - 1, 0][:3],
            pixels[0, height - 1][:3],
            pixels[width - 1, height - 1][:3],
        ]
        reference_rgbs = [rgb for rgb, _ in Counter(corner_rgbs).most_common(2)]
        if not reference_rgbs:
            reference_rgbs = [(200, 200, 200)]

        def is_background_pixel(x, y):
            red, green, blue, alpha = pixels[x, y]
            if alpha < 8:
                return True
            rgb = (red, green, blue)
            return any(_is_similar_rgb(rgb, reference_rgb) for reference_rgb in reference_rgbs)

        visited = [[False] * width for _ in range(height)]
        queue = deque()

        for x in range(width):
            queue.append((x, 0))
            queue.append((x, height - 1))
        for y in range(height):
            queue.append((0, y))
            queue.append((width - 1, y))

        while queue:
            x, y = queue.popleft()
            if x < 0 or y < 0 or x >= width or y >= height:
                continue
            if visited[y][x]:
                continue

            visited[y][x] = True
            if not is_background_pixel(x, y):
                continue

            pixels[x, y] = (255, 255, 255, 255)

            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))

        destination_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination_path)


def prepare_white_background_images(records):
    unique_files = []
    seen = set()
    for item in records:
        image_file = item.get("image_file", "")
        if image_file and image_file not in seen:
            seen.add(image_file)
            unique_files.append(image_file)

    total = len(unique_files)
    print(f"Kepelokeszites indul: {total} fajl feher hatterrel.")

    for index, image_file in enumerate(unique_files, start=1):
        source_path = PICTOGRAMS_DIR / image_file
        destination_path = PICTOGRAMS_WHITE_DIR / image_file

        if not source_path.exists():
            print(f"[{index}/{total}] Hianyzo forraskep: {source_path}")
            continue

        try:
            make_white_background_copy(source_path, destination_path)
        except Exception as error:
            destination_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, destination_path)
            print(
                f"[{index}/{total}] Feldolgozasi hiba miatt masolas tortent: {image_file} ({error})"
            )
            continue

        remaining = total - index
        print(f"[{index}/{total}] Kesz, {remaining} hatra: {destination_path}")


def build_html(records, language, image_subdir):
    grouped = build_grouped_data(records)

    if language == "hu":
        page_title = "Fitness gyakorlatok"
        subtitle = "Csoportositott gyakorlatlista ikonokkal"
        total_label = "Osszes gyakorlat"
    else:
        page_title = "Fitness Exercises"
        subtitle = "Grouped exercise catalog with icons"
        total_label = "Total exercises"

    total_count = sum(len(group_data["items"]) for group_data in grouped.values())

    sections = []
    for _, group_data in grouped.items():
        heading = group_data[language]
        cards = "\n".join(card_html(item, language, image_subdir) for item in group_data["items"])
        sections.append(
            f"""
    <section class=\"group\">
      <h2>{escape_html(heading)}</h2>
      <div class=\"grid\">
{cards}
      </div>
    </section>
            """.rstrip()
        )

    sections_html = "\n".join(sections)

    return f"""<!doctype html>
<html lang=\"{language}\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{escape_html(page_title)}</title>
  <style>
    :root {{
      --bg: #f4f6f8;
      --text: #1f2933;
      --muted: #52606d;
      --card: #ffffff;
      --line: #d9e2ec;
      --shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    }}

    * {{ box-sizing: border-box; }}

    body {{
      margin: 0;
      font-family: "Segoe UI", Tahoma, sans-serif;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
      color: var(--text);
    }}

    .container {{
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }}

    header {{
      margin-bottom: 24px;
      padding: 20px;
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: var(--shadow);
    }}

    h1 {{ margin: 0; font-size: 30px; }}
    .subtitle {{ margin: 8px 0 0; color: var(--muted); }}
    .meta {{ margin-top: 12px; color: var(--muted); font-size: 14px; }}

    .group {{ margin-bottom: 28px; }}
    h2 {{ margin: 0 0 14px; font-size: 24px; }}

    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }}

    .card {{
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      min-height: 260px;
    }}

    .icon-wrap {{
      width: 100%;
      aspect-ratio: 1 / 1;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }}

    .icon-wrap img {{
      width: 88%;
      height: 88%;
      object-fit: contain;
      background: #ffffff;
      border-radius: 8px;
    }}

    h3 {{
      margin: 12px 0 8px;
      font-size: 17px;
      line-height: 1.25;
    }}

    p {{
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }}

    @media (max-width: 640px) {{
      .container {{ padding: 14px; }}
      h1 {{ font-size: 24px; }}
      h2 {{ font-size: 20px; }}
    }}
  </style>
</head>
<body>
  <main class=\"container\">
    <header>
      <h1>{escape_html(page_title)}</h1>
      <p class=\"subtitle\">{escape_html(subtitle)}</p>
      <p class=\"meta\">{escape_html(total_label)}: {total_count}</p>
    </header>
{sections_html}
  </main>
</body>
</html>
"""


def main():
    with INPUT_JSON_PATH.open("r", encoding="utf-8") as handle:
        records = json.load(handle)

    total = len(records)
    print(f"Kezdes: {total} rekordbol keszul a ket HTML oldal.")

    prepare_white_background_images(records)
    image_subdir = PICTOGRAMS_WHITE_DIR.name

    html_hu = build_html(records, "hu", image_subdir)
    OUTPUT_HU_PATH.write_text(html_hu, encoding="utf-8")
    print(f"[1/2] Kesz: {OUTPUT_HU_PATH}")

    html_en = build_html(records, "en", image_subdir)
    OUTPUT_EN_PATH.write_text(html_en, encoding="utf-8")
    print(f"[2/2] Kesz: {OUTPUT_EN_PATH}")


if __name__ == "__main__":
    main()
