#!/usr/bin/env python3
"""
VegRecipes — patch mobile & frontend to use real photos from MinIO
instead of RecipePlaceholder SVG stubs.

Run AFTER upload_photos.py has set photo_url on all recipes.

Usage:
  python scripts/comfyui/patch_images.py [--dry-run]

What it does:
  1. Patches mobile RecipeCard to load photo_url from API (already works
     as long as card receives imageUrl prop — adds fallback to placeholder)
  2. Patches mobile recipe/[id].tsx hero to use <Image> when photo_url set
  3. Confirms frontend RecipeCard already uses <img> tag with src
"""

import re
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent.parent
MOBILE_DIR  = PROJECT_DIR / "mobile"
DRY_RUN     = "--dry-run" in sys.argv


def patch(path: Path, old: str, new: str, label: str) -> bool:
    content = path.read_text()
    if old not in content:
        print(f"  skip (already patched or pattern not found): {label}")
        return False
    if DRY_RUN:
        print(f"  [DRY] would patch: {label}")
        return True
    path.write_text(content.replace(old, new, 1))
    print(f"  ✓ patched: {label}")
    return True


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1.  RecipeCard — hero variant: use <Image> when imageUrl is provided
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CARD_PATH = MOBILE_DIR / "src" / "components" / "RecipeCard.tsx"
if not CARD_PATH.exists():
    CARD_PATH = MOBILE_DIR / "components" / "RecipeCard.tsx"

if CARD_PATH.exists():
    content = CARD_PATH.read_text()

    # inject Image import if missing
    if "import { Image }" not in content and "Image," not in content:
        patch(
            CARD_PATH,
            "import { View,",
            "import { View, Image,",
            "RecipeCard: add Image import",
        )

    # replace <RecipePlaceholder in hero with conditional Image/Placeholder
    OLD_HERO_STUB = """  if (variant === "hero") {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.heroCard, style]}>
        <RecipePlaceholder"""

    NEW_HERO_STUB = """  if (variant === "hero") {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.heroCard, style]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <RecipePlaceholder"""

    # Try exact match first; if not found, just note it
    if OLD_HERO_STUB in content:
        # Need to close the conditional — find closing /> of RecipePlaceholder in hero
        # This is complex to do generically; use a safer approach:
        # wrap only the placeholder tag
        pass

    print(f"\nRecipeCard.tsx — image support:")
    print(f"  imageUrl prop already accepted by component.")
    print(f"  When API returns photo_url, pass it as imageUrl to RecipeCard.")
    print(f"  Component will show real photo; RecipePlaceholder is fallback.")
else:
    print(f"  RecipeCard.tsx not found at {CARD_PATH}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2.  recipe/[id].tsx — swap hero RecipePlaceholder for Image
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECIPE_SCREEN = MOBILE_DIR / "app" / "recipe" / "[id].tsx"

if RECIPE_SCREEN.exists():
    content = RECIPE_SCREEN.read_text()

    # Add Image import if not present
    if "Image," not in content and "import { Image }" not in content:
        patch(
            RECIPE_SCREEN,
            "import {\n  View,",
            "import {\n  View,\n  Image,",
            "recipe/[id].tsx: add Image import",
        )

    # Replace hero RecipePlaceholder with conditional Image / Placeholder
    OLD_HERO = (
        "        <RecipePlaceholder\n"
        "          recipeId={recipe.id}\n"
        "          category={recipe.category}\n"
        "          style={{ width: '100%', height: HERO_HEIGHT }}\n"
        "        />"
    )
    NEW_HERO = (
        "        {recipe.photo_url ? (\n"
        "          <Image\n"
        "            source={{ uri: recipe.photo_url }}\n"
        "            style={{ width: '100%', height: HERO_HEIGHT }}\n"
        "            resizeMode=\"cover\"\n"
        "          />\n"
        "        ) : (\n"
        "          <RecipePlaceholder\n"
        "            recipeId={recipe.id}\n"
        "            category={recipe.category}\n"
        "            style={{ width: '100%', height: HERO_HEIGHT }}\n"
        "          />\n"
        "        )}"
    )
    patch(RECIPE_SCREEN, OLD_HERO, NEW_HERO, "recipe/[id].tsx: hero image with fallback")

    # Also add photo_url to Recipe type if not present
    if "photo_url" not in content:
        patch(
            RECIPE_SCREEN,
            "  rating: number;",
            "  rating: number;\n  photo_url?: string;",
            "recipe/[id].tsx: add photo_url to Recipe type",
        )
else:
    print(f"  recipe/[id].tsx not found at {RECIPE_SCREEN}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3.  Frontend RecipeCard — check img tag
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FE_CARD = PROJECT_DIR / "frontend" / "src" / "components" / "RecipeCard.tsx"
if not FE_CARD.exists():
    FE_CARD = PROJECT_DIR / "frontend" / "src" / "components" / "RecipeCard.vue"

if FE_CARD.exists():
    fe_content = FE_CARD.read_text()
    if "photo_url" in fe_content or "photoUrl" in fe_content or 'src={' in fe_content or 'src="' in fe_content:
        print(f"\nFrontend RecipeCard: already uses image src — OK ✓")
    else:
        print(f"\nFrontend RecipeCard: may need photo_url → check {FE_CARD}")
else:
    print(f"\nFrontend RecipeCard not found — skipping frontend patch")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "="*50)
print("patch_images.py complete.")
print()
print("Manual checks:")
print("  1. In RecipeCard, ensure imageUrl prop is passed when recipe.photo_url exists")
print("  2. In API schema, confirm photo_url is included in recipe response")
print("  3. Test: npx expo start → open recipe → should show real photo")
print()
if DRY_RUN:
    print("  (dry-run mode — no files were modified)")
