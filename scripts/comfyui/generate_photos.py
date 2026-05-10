#!/usr/bin/env python3
"""
VegRecipes — batch photo generation via ComfyUI API.

Usage:
  python scripts/comfyui/generate_photos.py [--host localhost] [--port 8188] \
      [--start 1] [--end 1000] [--workers 1] [--model juggernautXL_v9...]

Prerequisites:
  1. ComfyUI running: python main.py --listen --port 8188
  2. Model in ComfyUI/models/checkpoints/ (edit --model if different)
  3. pip install websocket-client pillow tqdm

Output:
  photos/img_0001.jpg … photos/img_1000.jpg
  progress saved to: photos/.progress.json  (resume on restart)
"""

import argparse
import json
import os
import sys
import time
import uuid
import random
import copy
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── import seed data ──────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_DIR / "backend"))
from seeds.seed_data import ALL_RECIPES  # noqa

# ── category → English food type ──────────────────────────────────────────────
CATEGORY_EN = {
    "Завтраки":       "breakfast dish",
    "Салаты":         "fresh salad",
    "Супы":           "soup",
    "Вторые блюда":   "main course",
    "Закуски":        "appetizer snack",
    "Выпечка":        "baked goods bread",
    "Сладости":       "dessert sweet",
    "Напитки":        "beverage drink",
    "Соусы":          "sauce dip condiment",
    "Детское питание":"healthy kids meal",
    "Заготовки":      "preserved food jar",
}

# ── ingredient name → English ─────────────────────────────────────────────────
ING_EN = {
    "овсяные хлопья": "oat flakes", "яблоко": "apple", "ваниль": "vanilla",
    "морковь": "carrot", "картофель": "potato", "помидор": "tomato",
    "огурец": "cucumber", "лук": "onion", "чеснок": "garlic",
    "шпинат": "spinach", "брокколи": "broccoli", "цветная капуста": "cauliflower",
    "тыква": "pumpkin", "авокадо": "avocado", "лимон": "lemon",
    "апельсин": "orange", "клубника": "strawberry", "малина": "raspberry",
    "черника": "blueberry", "банан": "banana", "манго": "mango",
    "нут": "chickpeas", "чечевица": "lentils", "фасоль": "beans",
    "тофу": "tofu", "темпе": "tempeh", "рис": "rice", "гречка": "buckwheat",
    "киноа": "quinoa", "перловка": "pearl barley", "пшено": "millet",
    "мука": "flour", "яйцо": "egg", "яйца": "eggs", "масло": "oil",
    "оливковое масло": "olive oil", "кокосовое молоко": "coconut milk",
    "миндальное молоко": "almond milk", "мёд": "honey", "сахар": "sugar",
    "соль": "salt", "перец": "black pepper", "куркума": "turmeric",
    "имбирь": "ginger", "корица": "cinnamon", "зира": "cumin",
    "базилик": "basil", "петрушка": "parsley", "укроп": "dill",
    "кинза": "cilantro", "мята": "mint", "розмарин": "rosemary",
    "тимьян": "thyme", "паприка": "paprika", "кориандр": "coriander",
    "кешью": "cashews", "миндаль": "almonds", "грецкий орех": "walnuts",
    "арахис": "peanuts", "тахини": "tahini", "хумус": "hummus",
    "греческий йогурт": "greek yogurt", "сливки": "cream",
    "пармезан": "parmesan", "рикотта": "ricotta", "фета": "feta",
    "моцарелла": "mozzarella", "баклажан": "eggplant", "кабачок": "zucchini",
    "болгарский перец": "bell pepper", "свёкла": "beet", "капуста": "cabbage",
    "белокочанная капуста": "white cabbage", "краснокочанная капуста": "red cabbage",
    "пекинская капуста": "napa cabbage", "сельдерей": "celery",
    "фенхель": "fennel", "спаржа": "asparagus", "горошек": "peas",
    "кукуруза": "corn", "артишок": "artichoke", "редис": "radish",
    "репа": "turnip", "пастернак": "parsnip", "ревень": "rhubarb",
    "персик": "peach", "груша": "pear", "слива": "plum", "вишня": "cherry",
    "виноград": "grapes", "инжир": "figs", "финик": "dates",
    "кокосовая стружка": "coconut flakes", "семена чиа": "chia seeds",
    "льняное семя": "flaxseed", "тыквенные семечки": "pumpkin seeds",
    "кунжут": "sesame seeds", "шоколад": "chocolate", "какао": "cocoa",
    "ягоды": "mixed berries", "грибы": "mushrooms", "шампиньоны": "champignons",
    "вешенки": "oyster mushrooms", "лисички": "chanterelles",
    "белые грибы": "porcini mushrooms", "чечевица красная": "red lentils",
    "чечевица зелёная": "green lentils", "нори": "nori seaweed",
    "водоросли": "seaweed", "мисо": "miso paste",
}

# ── surface / lighting variations ─────────────────────────────────────────────
SURFACES = [
    "white ceramic plate on rustic wooden table",
    "slate board with linen napkin",
    "light concrete surface with fresh herbs",
    "marble surface with wooden spoon",
    "dark wooden cutting board",
    "terracotta bowl on stone surface",
]

LIGHTING = [
    "soft natural side window",
    "warm morning golden hour",
    "bright studio softbox",
    "moody dramatic side",
    "diffused overhead natural",
]

GARNISHES = [
    "fresh herbs garnish",
    "drizzle of olive oil",
    "sprinkle of sesame seeds",
    "microgreens on top",
    "edible flowers decoration",
    "",
]


def build_prompt(recipe: dict) -> str:
    category = recipe.get("category", "")
    title = recipe.get("title", "")
    ingredients = recipe.get("ingredients", [])

    cat_en = CATEGORY_EN.get(category, "vegetarian dish")

    # translate up to 4 main ingredients
    ing_names = []
    for ing in ingredients[:6]:
        ru = ing.get("name", "").lower()
        for key, val in ING_EN.items():
            if key in ru:
                ing_names.append(val)
                break
    if not ing_names:
        ing_names = ["fresh vegetables"]

    ing_str = ", ".join(ing_names[:4])

    surface = random.choice(SURFACES)
    lighting = random.choice(LIGHTING)
    garnish = random.choice(GARNISHES)
    garnish_part = f", {garnish}" if garnish else ""

    prompt = (
        f"professional food photography, {cat_en}, "
        f"made with {ing_str}, "
        f"plated on {surface}, "
        f"{lighting} lighting, "
        f"shallow depth of field, bokeh background"
        f"{garnish_part}, "
        f"appetizing, vibrant colors, clean composition, "
        f"8k ultra detailed, photorealistic, award-winning food photo"
    )
    return prompt


NEGATIVE_PROMPT = (
    "text, watermark, logo, signature, blurry, bad quality, low resolution, "
    "illustration, drawing, painting, cartoon, anime, 3d render, "
    "human hands, person, face, people, meat, fish, seafood, blood"
)


def load_workflow(workflow_path: Path, positive: str, seed: int) -> dict:
    wf = json.loads(workflow_path.read_text())
    wf = copy.deepcopy(wf)
    wf["2"]["inputs"]["text"] = positive
    wf["3"]["inputs"]["text"] = NEGATIVE_PROMPT
    wf["5"]["inputs"]["seed"] = seed
    return wf


def queue_prompt(host: str, port: int, workflow: dict, client_id: str) -> str:
    import urllib.request
    payload = json.dumps({"prompt": workflow, "client_id": client_id}).encode()
    req = urllib.request.Request(
        f"http://{host}:{port}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["prompt_id"]


def wait_and_get_image(host: str, port: int, prompt_id: str, client_id: str, timeout: int = 120) -> bytes:
    """Poll /history until prompt is done, then download the image."""
    import urllib.request
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(1)
        url = f"http://{host}:{port}/history/{prompt_id}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                history = json.loads(resp.read())
            if prompt_id in history:
                outputs = history[prompt_id]["outputs"]
                for node_id, node_output in outputs.items():
                    if "images" in node_output:
                        img_info = node_output["images"][0]
                        img_url = (
                            f"http://{host}:{port}/view"
                            f"?filename={img_info['filename']}"
                            f"&subfolder={img_info.get('subfolder','')}"
                            f"&type={img_info.get('type','output')}"
                        )
                        with urllib.request.urlopen(img_url, timeout=30) as r:
                            return r.read()
        except Exception:
            pass
    raise TimeoutError(f"Prompt {prompt_id} timed out after {timeout}s")


def save_as_jpeg(raw_png: bytes, dest_path: Path, quality: int = 92):
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(raw_png)).convert("RGB")
    img = img.resize((1024, 1024), Image.LANCZOS)
    img.save(dest_path, "JPEG", quality=quality, optimize=True)


def load_progress(progress_path: Path) -> set:
    if progress_path.exists():
        return set(json.loads(progress_path.read_text()))
    return set()


def save_progress(progress_path: Path, done: set):
    progress_path.write_text(json.dumps(sorted(done)))


def generate_one(args_tuple):
    idx, recipe, host, port, workflow_path, photos_dir, client_id = args_tuple
    img_name = f"img_{idx:04d}.jpg"
    dest = photos_dir / img_name

    positive = build_prompt(recipe)
    seed = random.randint(0, 0xFFFFFFFF)
    workflow = load_workflow(workflow_path, positive, seed)

    try:
        prompt_id = queue_prompt(host, port, workflow, client_id)
        raw = wait_and_get_image(host, port, prompt_id, client_id)
        save_as_jpeg(raw, dest)
        return idx, True, None
    except Exception as e:
        return idx, False, str(e)


def main():
    ap = argparse.ArgumentParser(description="Batch food photo generation via ComfyUI")
    ap.add_argument("--host",    default="localhost")
    ap.add_argument("--port",    type=int, default=8188)
    ap.add_argument("--start",   type=int, default=1,    help="First recipe index (1-based)")
    ap.add_argument("--end",     type=int, default=1000, help="Last recipe index (1-based, inclusive)")
    ap.add_argument("--workers", type=int, default=1,    help="Parallel ComfyUI queues (use 1 unless GPU can handle it)")
    ap.add_argument("--model",   default="juggernautXL_v9Rdphoto2Lightning.safetensors")
    ap.add_argument("--quality", type=int, default=92)
    ap.add_argument("--timeout", type=int, default=120,  help="Seconds to wait per image")
    ap.add_argument("--resume",  action="store_true",    help="Skip already-generated photos")
    args = ap.parse_args()

    workflow_path = SCRIPT_DIR / "workflow_food.json"
    photos_dir    = PROJECT_DIR / "photos"
    progress_path = photos_dir / ".progress.json"
    photos_dir.mkdir(exist_ok=True)

    # patch model name in workflow file for this run
    wf_data = json.loads(workflow_path.read_text())
    wf_data["1"]["inputs"]["ckpt_name"] = args.model
    workflow_path_tmp = photos_dir / "_workflow_tmp.json"
    workflow_path_tmp.write_text(json.dumps(wf_data))

    # check ComfyUI reachability
    import urllib.request
    try:
        urllib.request.urlopen(f"http://{args.host}:{args.port}/system_stats", timeout=5)
    except Exception:
        print(f"✗ Cannot reach ComfyUI at http://{args.host}:{args.port}")
        print("  Start ComfyUI: python main.py --listen --port 8188")
        sys.exit(1)

    done = load_progress(progress_path) if args.resume else set()
    recipes = ALL_RECIPES[args.start - 1 : args.end]

    tasks = []
    for i, recipe in enumerate(recipes):
        idx = args.start + i
        img_path = photos_dir / f"img_{idx:04d}.jpg"
        if args.resume and idx in done:
            continue
        if args.resume and img_path.exists():
            done.add(idx)
            continue
        client_id = str(uuid.uuid4())
        tasks.append((idx, recipe, args.host, args.port, workflow_path_tmp, photos_dir, client_id))

    total = len(tasks) + len(done)
    remaining = len(tasks)
    print(f"ComfyUI: http://{args.host}:{args.port}")
    print(f"Model:   {args.model}")
    print(f"Recipes: {args.start}–{args.end}  |  Total: {total}  |  Remaining: {remaining}")
    print()

    success = len(done)
    failed = []

    try:
        from tqdm import tqdm
        pbar = tqdm(total=remaining, unit="img", desc="Generating")
    except ImportError:
        pbar = None

    if args.workers == 1:
        # sequential — simpler, avoids GPU contention
        for task in tasks:
            idx, ok, err = generate_one(task)
            if ok:
                success += 1
                done.add(idx)
                save_progress(progress_path, done)
                msg = f"  ✓ img_{idx:04d}.jpg"
            else:
                failed.append(idx)
                msg = f"  ✗ img_{idx:04d}.jpg — {err}"

            if pbar:
                pbar.update(1)
                pbar.set_postfix(ok=success, fail=len(failed))
            else:
                print(msg)
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(generate_one, t): t[0] for t in tasks}
            for fut in as_completed(futures):
                idx, ok, err = fut.result()
                if ok:
                    success += 1
                    done.add(idx)
                    save_progress(progress_path, done)
                else:
                    failed.append(idx)
                if pbar:
                    pbar.update(1)
                    pbar.set_postfix(ok=success, fail=len(failed))

    if pbar:
        pbar.close()

    workflow_path_tmp.unlink(missing_ok=True)

    print(f"\n{'='*50}")
    print(f"✅ Done: {success}/{total}")
    if failed:
        print(f"✗ Failed ({len(failed)}): {failed[:20]}{'...' if len(failed)>20 else ''}")
        print(f"  Re-run with --resume to retry failed images")
    print(f"\nPhotos saved to: {photos_dir}")
    print(f"\nNext step:")
    print(f"  python scripts/comfyui/upload_photos.py")


if __name__ == "__main__":
    main()
