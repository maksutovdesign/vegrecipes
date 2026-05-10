#!/usr/bin/env python3
"""
VegRecipes — upload generated photos to MinIO + update recipe.photo_url in DB.

Run after generate_photos.py has produced photos/img_0001.jpg … img_1000.jpg.

Usage:
  # With services running via Docker Compose:
  docker compose run --rm --no-deps \
    -e DATABASE_URL_SYNC=postgresql://vegrecipes:vegrecipes@postgres:5432/vegrecipes \
    backend python /app/scripts/comfyui/upload_photos.py

  # Or directly (backend venv, services on localhost):
  python scripts/comfyui/upload_photos.py [--photos-dir photos] [--dry-run]
"""

import argparse
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_DIR / "backend"))

from config import settings


def get_s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
    )


def ensure_bucket_public(s3, bucket: str):
    import json
    from botocore.exceptions import ClientError
    try:
        s3.create_bucket(Bucket=bucket)
    except ClientError as e:
        if "BucketAlreadyOwned" not in str(e) and "BucketAlreadyExists" not in str(e):
            raise
    policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{bucket}/*",
        }],
    })
    s3.put_bucket_policy(Bucket=bucket, Policy=policy)


def upload_photo(s3, bucket: str, local_path: Path, key: str) -> str:
    """Upload file and return public URL."""
    s3.upload_file(
        str(local_path),
        bucket,
        key,
        ExtraArgs={"ContentType": "image/jpeg"},
    )
    endpoint = settings.S3_ENDPOINT.rstrip("/")
    return f"{endpoint}/{bucket}/{key}"


def main():
    ap = argparse.ArgumentParser(description="Upload recipe photos to MinIO + update DB")
    ap.add_argument("--photos-dir", default=str(PROJECT_DIR / "photos"))
    ap.add_argument("--dry-run", action="store_true", help="Show what would be done, no writes")
    ap.add_argument("--prefix", default="recipes/photos", help="S3 key prefix")
    ap.add_argument("--overwrite", action="store_true", help="Re-upload even if key exists in S3")
    args = ap.parse_args()

    photos_dir = Path(args.photos_dir)
    photos = sorted(photos_dir.glob("img_????.jpg"))

    if not photos:
        print(f"No photos found in {photos_dir}")
        print("Run: python scripts/comfyui/generate_photos.py")
        sys.exit(1)

    print(f"Found {len(photos)} photos in {photos_dir}")

    # ── connect to S3 ─────────────────────────────────────────────────────────
    s3 = get_s3_client()
    bucket = settings.S3_BUCKET

    if not args.dry_run:
        ensure_bucket_public(s3, bucket)
        print(f"Bucket: {bucket} ({settings.S3_ENDPOINT})")

    # ── connect to DB ─────────────────────────────────────────────────────────
    from sqlalchemy import create_engine, text
    db_url = os.environ.get("DATABASE_URL_SYNC", settings.DATABASE_URL_SYNC)
    engine = create_engine(db_url, echo=False)

    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, slug, main_photo FROM recipe ORDER BY id")
        ).fetchall()

    print(f"Recipes in DB: {len(rows)}")
    print()

    # pair photos to recipes by position (img_0001 → recipe #1, etc.)
    updates = []
    skipped = 0
    to_upload = 0

    for photo_path in photos:
        # extract 1-based index from filename
        stem = photo_path.stem  # img_0001
        try:
            idx = int(stem.split("_")[1])  # 1
        except (IndexError, ValueError):
            print(f"  skip (bad name): {photo_path.name}")
            continue

        if idx < 1 or idx > len(rows):
            print(f"  skip (no recipe #{idx}): {photo_path.name}")
            skipped += 1
            continue

        recipe_id, slug, current_photo = rows[idx - 1]
        s3_key = f"{args.prefix}/{photo_path.name}"
        public_url = f"{settings.S3_ENDPOINT.rstrip('/')}/{bucket}/{s3_key}"

        if current_photo == public_url and not args.overwrite:
            skipped += 1
            continue

        to_upload += 1
        updates.append((recipe_id, photo_path, s3_key, public_url))

    print(f"To upload: {to_upload}  |  Already done / no recipe: {skipped}")
    print()

    if args.dry_run:
        for recipe_id, photo_path, s3_key, public_url in updates[:5]:
            print(f"  [DRY] {photo_path.name} → s3://{bucket}/{s3_key}")
        if len(updates) > 5:
            print(f"  ... and {len(updates)-5} more")
        return

    # ── upload + update DB ────────────────────────────────────────────────────
    ok = 0
    fail = 0

    try:
        from tqdm import tqdm
        bar = tqdm(total=len(updates), unit="img")
    except ImportError:
        bar = None

    with engine.connect() as conn:
        for recipe_id, photo_path, s3_key, public_url in updates:
            try:
                upload_photo(s3, bucket, photo_path, s3_key)
                conn.execute(
                    text("UPDATE recipe SET main_photo = :url WHERE id = :id"),
                    {"url": public_url, "id": recipe_id},
                )
                conn.commit()
                ok += 1
            except Exception as e:
                fail += 1
                print(f"\n  ✗ {photo_path.name}: {e}")

            if bar:
                bar.update(1)
                bar.set_postfix(ok=ok, fail=fail)

    if bar:
        bar.close()

    print(f"\n{'='*50}")
    print(f"✅ Uploaded: {ok}")
    if fail:
        print(f"✗ Failed:   {fail}")
    print(f"\nPhotos available at:")
    print(f"  {settings.S3_ENDPOINT.rstrip('/')}/{bucket}/{args.prefix}/img_0001.jpg")
    print(f"\nMinIO console: http://localhost:9001  (vegrecipes / vegrecipes_secret)")


if __name__ == "__main__":
    main()
