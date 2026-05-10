# VegRecipes — ComfyUI Photo Generation Pipeline

Generates 1000 professional food photos via ComfyUI (Stable Diffusion XL),
uploads them to MinIO, and wires them into the app automatically.

---

## Prerequisites

### 1. ComfyUI

```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt
```

### 2. Model

Download a food-photography-capable SDXL model into `ComfyUI/models/checkpoints/`.

**Recommended (free):**
| Model | Quality | Speed | Link |
|-------|---------|-------|------|
| `juggernautXL_v9Rdphoto2Lightning.safetensors` | ★★★★★ | Fast (Lightning) | civitai.com/models/133005 |
| `dreamshaperXL_turboDpmppSDE.safetensors` | ★★★★☆ | Fast (Turbo) | civitai.com/models/112902 |
| `realvisxlV50_v50Bakedvae.safetensors` | ★★★★★ | Normal | civitai.com/models/139562 |

Rename the downloaded file to match `--model` flag (default: `juggernautXL_v9Rdphoto2Lightning.safetensors`).

### 3. Python dependencies (for scripts)

```bash
pip install boto3 pillow tqdm websocket-client sqlalchemy psycopg2-binary
```

---

## Step 1 — Start services

```bash
cd /path/to/vegrecipes
./start.sh          # starts PostgreSQL, Redis, MinIO, backend, frontend
```

---

## Step 2 — Start ComfyUI

```bash
cd ComfyUI
python main.py --listen --port 8188
# Open http://localhost:8188 to confirm it's running
```

---

## Step 3 — Generate photos

```bash
cd /path/to/vegrecipes

# All 1000 recipes (sequential, safe for single GPU):
python scripts/comfyui/generate_photos.py

# Custom range (e.g. first 100 for testing):
python scripts/comfyui/generate_photos.py --start 1 --end 100

# Resume interrupted run:
python scripts/comfyui/generate_photos.py --resume

# Different model:
python scripts/comfyui/generate_photos.py --model dreamshaperXL_turboDpmppSDE.safetensors

# See all options:
python scripts/comfyui/generate_photos.py --help
```

Photos saved to: `photos/img_0001.jpg` … `photos/img_1000.jpg`  
Progress tracked in: `photos/.progress.json` (safe to interrupt & resume)

---

## Step 4 — Upload to MinIO + update DB

```bash
# Run inside Docker (recommended — uses correct Docker networking):
docker compose run --rm --no-deps \
  -v "$(pwd)/photos:/app/photos" \
  -v "$(pwd)/scripts:/app/scripts" \
  -e DATABASE_URL_SYNC=postgresql://vegrecipes:vegrecipes@postgres:5432/vegrecipes \
  backend \
  python /app/scripts/comfyui/upload_photos.py

# Or locally (if backend deps installed + services on localhost):
python scripts/comfyui/upload_photos.py

# Dry run first:
python scripts/comfyui/upload_photos.py --dry-run
```

This:
1. Uploads each `img_XXXX.jpg` to MinIO as `recipes/photos/img_XXXX.jpg`
2. Updates `recipe.main_photo` in PostgreSQL with the public URL
3. Shows progress bar; resumable (skips already-uploaded)

---

## Step 5 — Verify

```bash
# Check a few recipes have photo URLs:
docker compose exec postgres psql -U vegrecipes -c \
  "SELECT id, title, main_photo FROM recipe WHERE main_photo IS NOT NULL LIMIT 5;"

# Open in browser:
open http://localhost:9001  # MinIO console → vegrecipes-media bucket → recipes/photos/
open http://localhost:8000/api/v1/recipes/1  # API response should include main_photo
open http://localhost:3000  # Web frontend — real photos in cards
```

Mobile: `npx expo start` → open recipe list → real photos appear in cards.

---

## Workflow details

**Workflow file:** `scripts/comfyui/workflow_food.json`

- Model: SDXL (Lightning/Turbo variant for 6-step generation)
- Resolution: 1024×1024
- Steps: 6 (Lightning) — ~3-8s per image on modern GPU
- Sampler: DPM++ 2M SDE Karras
- CFG: 4.5

**Prompt strategy:**
- Category → English food type (`Завтраки` → `breakfast dish`)
- Title ingredients → translated key ingredient list
- Random surface + lighting + garnish per recipe (visual variety)
- Fixed negative: no text, no people, no meat/fish

---

## Estimated time

| GPU | Time per image | 1000 images |
|-----|---------------|-------------|
| RTX 4090 | ~3s | ~50 min |
| RTX 3080 | ~6s | ~100 min |
| RTX 3060 | ~10s | ~2.8h |
| M2 Max (MPS) | ~20s | ~5.5h |
| CPU only | ~120s | ~33h |

---

## Troubleshooting

**ComfyUI not reachable:**
```
✗ Cannot reach ComfyUI at http://localhost:8188
```
→ Start ComfyUI with `python main.py --listen --port 8188`

**Model not found:**
```
Error: checkpoint not found: juggernautXL_...
```
→ Check filename in `ComfyUI/models/checkpoints/` and pass exact name with `--model`

**MinIO connection refused:**
→ Make sure `./start.sh` was run and MinIO is up: `docker compose ps`

**Out of VRAM:**
→ Use `--workers 1` (default) and reduce batch in workflow to 1
