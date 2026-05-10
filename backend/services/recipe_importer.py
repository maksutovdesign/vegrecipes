"""Import recipes from social media URLs via yt-dlp + Whisper + Claude."""
import tempfile
import os
import subprocess
from typing import Optional
from openai import AsyncOpenAI
from config import settings
from services.ai_assistant import extract_recipe_from_text
from services.nutrition import calculate_nutrition


SUPPORTED_DOMAINS = ["tiktok.com", "instagram.com", "youtube.com", "youtu.be", "shorts"]


def _is_supported_url(url: str) -> bool:
    return any(domain in url for domain in SUPPORTED_DOMAINS)


async def download_audio(url: str) -> Optional[str]:
    """Download audio track from video URL using yt-dlp."""
    tmp_dir = tempfile.mkdtemp()
    output_path = os.path.join(tmp_dir, "audio.mp3")
    try:
        result = subprocess.run(
            ["yt-dlp", "-x", "--audio-format", "mp3", "-o", output_path, url],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode == 0 and os.path.exists(output_path):
            return output_path
    except Exception:
        pass
    return None


async def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio using OpenAI Whisper API."""
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    with open(audio_path, "rb") as f:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="ru",
        )
    return transcript.text


async def import_from_url(url: str) -> Optional[dict]:
    """Full pipeline: download → transcribe → extract → nutrition."""
    if not _is_supported_url(url):
        return None

    audio_path = await download_audio(url)
    if not audio_path:
        return None

    try:
        transcript = await transcribe_audio(audio_path)
        recipe_data = await extract_recipe_from_text(transcript)

        if recipe_data and recipe_data.get("ingredients"):
            nutrition = calculate_nutrition(recipe_data["ingredients"], recipe_data.get("servings", 4))
            recipe_data["nutrition"] = nutrition
            recipe_data["imported_from_url"] = url

        return recipe_data
    finally:
        try:
            os.unlink(audio_path)
        except Exception:
            pass
