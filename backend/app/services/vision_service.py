import base64
import httpx
import logging
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger(__name__)

VISION_PROMPT = (
    "You are an expert food analysis AI for a diabetes health app. "
    "Carefully analyze this food image and provide a detailed, structured description. "
    "Include: "
    "1) The EXACT food item name (be specific, e.g. 'Chicken Biryani' not just 'rice dish'). "
    "2) All visible ingredients and components. "
    "3) Estimated total portion weight in grams (be realistic). "
    "4) Cooking method (fried, steamed, baked, raw, etc.). "
    "5) Food category (e.g., Indian meal, Western fast food, snack, salad, dessert). "
    "6) Any visible high-sugar or high-carb items (bread, rice, pasta, sweets). "
    "7) Estimated glycemic impact (low/medium/high) based on visible ingredients. "
    "Be specific and detailed — accuracy is critical for diabetes management."
)


async def analyze_food_image(image_path: str) -> str:
    """
    Reads image from disk, base64 encodes it, and sends to Ollama moondream.
    Returns the raw vision text output.
    """
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image file not found: {image_path}",
        )

    payload = {
        "model": settings.OLLAMA_VISION_MODEL,
        "prompt": VISION_PROMPT,
        "images": [image_b64],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vision AI service timed out. Please try again.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vision AI service error: {e.response.status_code}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vision AI unavailable: {str(e)}",
        )


async def analyze_food_image_with_rag(image_path: str) -> tuple[str, str, list[str]]:
    """
    Enhanced food image analysis with RAG context retrieval.
    
    Steps:
    1. Run moondream vision on the image
    2. Use vision description to retrieve relevant nutrition facts from ChromaDB
    3. Return (vision_text, rag_context_string, rag_sources_list)
    """
    # Step 1: Vision analysis
    vision_text = await analyze_food_image(image_path)

    # Step 2: RAG retrieval based on vision output
    rag_sources: list[str] = []
    rag_context = ""
    try:
        from app.services.rag_service import retrieve
        from app.config import settings as cfg
        rag_sources = retrieve(vision_text, cfg.RAG_COLLECTION_NUTRITION, k=6)
        if rag_sources:
            rag_context = "RETRIEVED NUTRITION FACTS FROM DATABASE:\n" + "\n".join(
                f"  - {src}" for src in rag_sources
            )
            logger.info(f"RAG retrieved {len(rag_sources)} nutrition facts for scan")
        else:
            logger.debug("RAG returned no results (collection may be empty or indexing in progress)")
    except Exception as e:
        logger.warning(f"RAG retrieval failed (non-fatal): {e}")

    return vision_text, rag_context, rag_sources

