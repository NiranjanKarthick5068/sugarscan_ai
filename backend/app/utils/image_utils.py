import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
import aiofiles
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import io


MAX_IMAGE_DIM = 1920
JPEG_QUALITY = 85


async def compress_image_for_storage(content: bytes) -> bytes:
    """
    Validates and compresses the image for storage.
    Returns JPEG bytes.
    """
    # Validate it's a real image via Pillow
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        # Re-open after verify (verify closes the stream)
        img = Image.open(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file is not a valid image ({type(e).__name__}: {e})",
        )

    # Convert to RGB if necessary (handles PNG with alpha, etc.)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Resize if too large
    w, h = img.size
    if w > MAX_IMAGE_DIM or h > MAX_IMAGE_DIM:
        img.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM), Image.Resampling.LANCZOS)

    # Compress to JPEG
    compressed = io.BytesIO()
    img.save(compressed, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return compressed.getvalue()


async def save_upload_image_bytes(
    content: bytes,
    user_id: str,
    media_dir: str = "",
    base_url: str = "",
) -> tuple[str, str | None]:
    """
    Validates, compresses, and saves the image to the local media directory.

    Returns:
        (relative_path, full_served_url)
    """
    compressed_bytes = await compress_image_for_storage(content)

    month_str = datetime.now(timezone.utc).strftime("%Y-%m")
    filename = f"{uuid.uuid4()}.jpg"
    relative_path = f"{month_str}/{filename}"

    # Save to local disk
    save_dir = Path(media_dir) / month_str
    save_dir.mkdir(parents=True, exist_ok=True)
    full_path = save_dir / filename
    
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(compressed_bytes)

    served_url = f"{base_url.rstrip('/')}/media/{month_str}/{filename}"
    return relative_path, served_url


async def save_upload_image(
    file: UploadFile,
    user_id: str,
    media_dir: str,
    base_url: str = "http://localhost:8000",
) -> tuple[str, str]:
    """
    Validates, compresses, and saves the uploaded image.

    Returns:
        (relative_path, full_served_url)
    """
    content = await file.read()
    return await save_upload_image_bytes(content, user_id, media_dir, base_url)


async def delete_image(image_path: str, media_dir: str) -> None:
    """Remove image file from disk. Silently ignores if not found."""
    full_path = Path(media_dir) / image_path
    try:
        if full_path.exists():
            os.remove(str(full_path))
    except Exception:
        pass  # Ignore errors on delete
