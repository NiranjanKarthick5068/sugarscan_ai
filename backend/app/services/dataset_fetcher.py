"""
backend/app/services/dataset_fetcher.py

Auto-fetches nutrition data from Open Food Facts and USDA FoodData Central,
converts to embeddable text chunks, and upserts into ChromaDB RAG collection.
Runs on startup and every 12h via APScheduler.
"""
import logging
import asyncio
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/search"
USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


def _food_to_chunk(food: dict) -> Optional[str]:
    """Convert a raw food dict (from either API) into a single embeddable text string."""
    name = food.get("name", "").strip()
    if not name:
        return None

    parts = [f"{name}"]
    cal = food.get("calories")
    carbs = food.get("carbs_g")
    protein = food.get("protein_g")
    fat = food.get("fat_g")
    sugar = food.get("sugar_g")
    fiber = food.get("fiber_g")
    gi = food.get("glycemic_index")
    category = food.get("category", "")
    per = food.get("per", "100g")

    if cal is not None:
        parts.append(f"per {per}: {cal:.0f} cal")
    if carbs is not None:
        parts.append(f"{carbs:.1f}g carbs")
    if protein is not None:
        parts.append(f"{protein:.1f}g protein")
    if fat is not None:
        parts.append(f"{fat:.1f}g fat")
    if sugar is not None:
        parts.append(f"{sugar:.1f}g sugar")
    if fiber is not None:
        parts.append(f"{fiber:.1f}g fiber")
    if gi is not None:
        parts.append(f"GI≈{gi}")
    if category:
        parts.append(f"category: {category}")

    return ", ".join(parts) if len(parts) > 1 else None


def _parse_off_product(product: dict) -> Optional[dict]:
    """Parse a single Open Food Facts product into a normalised food dict."""
    try:
        name = (
            product.get("product_name_en")
            or product.get("product_name")
            or ""
        ).strip()
        if not name or len(name) < 3:
            return None

        nutriments = product.get("nutriments", {})

        def safe_float(val) -> Optional[float]:
            try:
                return float(val) if val not in (None, "", "unknown") else None
            except (ValueError, TypeError):
                return None

        return {
            "name": name,
            "calories": safe_float(nutriments.get("energy-kcal_100g")),
            "carbs_g": safe_float(nutriments.get("carbohydrates_100g")),
            "protein_g": safe_float(nutriments.get("proteins_100g")),
            "fat_g": safe_float(nutriments.get("fat_100g")),
            "sugar_g": safe_float(nutriments.get("sugars_100g")),
            "fiber_g": safe_float(nutriments.get("fiber_100g")),
            "category": product.get("categories_tags", [""])[0].replace("en:", "") if product.get("categories_tags") else "",
            "per": "100g",
        }
    except Exception:
        return None


def _parse_usda_food(food: dict) -> Optional[dict]:
    """Parse a USDA FoodData Central food into a normalised food dict."""
    try:
        name = food.get("description", "").strip()
        if not name or len(name) < 3:
            return None

        nutrients_raw = {n["nutrientName"]: n.get("value") for n in food.get("foodNutrients", [])}

        def get_nutrient(*keys):
            for k in keys:
                for nk, val in nutrients_raw.items():
                    if k.lower() in nk.lower():
                        try:
                            return float(val)
                        except (TypeError, ValueError):
                            pass
            return None

        return {
            "name": name,
            "calories": get_nutrient("Energy"),
            "carbs_g": get_nutrient("Carbohydrate"),
            "protein_g": get_nutrient("Protein"),
            "fat_g": get_nutrient("Total lipid"),
            "sugar_g": get_nutrient("Sugars"),
            "fiber_g": get_nutrient("Fiber"),
            "category": food.get("foodCategory", ""),
            "per": "100g",
        }
    except Exception:
        return None


async def fetch_open_food_facts(limit: int = 2000) -> list[dict]:
    """Fetch foods from Open Food Facts API, focusing on diverse global cuisines."""
    foods = []
    page_size = 50
    pages = limit // page_size

    # Diverse global cuisines and food types
    categories = ["indian", "chinese", "mexican", "italian", "thai", "mediterranean", "japanese", "korean", "snack", "beverage", "meal"]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for category in categories:
            pages_per_category = max(1, pages // len(categories))
            for page in range(1, pages_per_category + 1):
                try:
                    params = {
                        "action": "process",
                        "fields": "product_name,product_name_en,nutriments,categories_tags",
                        "categories_tags_en": category,
                        "page_size": page_size,
                        "page": page,
                        "json": 1,
                    }
                    resp = await client.get(OPEN_FOOD_FACTS_URL, params=params)
                    resp.raise_for_status()
                    products = resp.json().get("products", [])
                    if not products:
                        break
                    for p in products:
                        parsed = _parse_off_product(p)
                        if parsed:
                            foods.append(parsed)
                    await asyncio.sleep(0.2)
                except Exception as e:
                    logger.warning(f"OFF category '{category}' page {page} failed: {e}")
                    await asyncio.sleep(1)

    logger.info(f"Fetched {len(foods)} foods from Open Food Facts")
    return foods


async def fetch_usda_foods(api_key: str, limit: int = 1000) -> list[dict]:
    """Fetch foods from USDA FoodData Central API."""
    if not api_key:
        logger.warning("No USDA_API_KEY set — skipping USDA fetch")
        return []

    foods = []
    page_size = 50
    pages = limit // page_size

    # Fetch diverse food categories and international cuisines
    queries = [
        "indian", "chinese", "mexican", "italian", "thai", "mediterranean", "middle eastern",
        "vegetables", "fruits", "grains", "meat", "dairy", "legumes", "nuts", "seafood", "snacks", "beverages"
    ]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in queries:
            pages_per_query = max(1, pages // len(queries))
            for page in range(1, pages_per_query + 1):
                try:
                    params = {
                        "query": query,
                        "pageSize": page_size,
                        "pageNumber": page,
                        "api_key": api_key,
                        "dataType": "Foundation,SR Legacy",
                    }
                    resp = await client.get(USDA_SEARCH_URL, params=params)
                    resp.raise_for_status()
                    items = resp.json().get("foods", [])
                    if not items:
                        break
                    for item in items:
                        parsed = _parse_usda_food(item)
                        if parsed:
                            foods.append(parsed)
                    await asyncio.sleep(0.2)  # Rate limit
                except Exception as e:
                    logger.warning(f"USDA fetch '{query}' page {page} failed: {e}")

    logger.info(f"Fetched {len(foods)} foods from USDA FoodData Central")
    return foods


def get_static_indian_foods() -> list[dict]:
    """Return a curated list of Indian foods with known nutritional data."""
    return [
        {"name": "Chicken Biryani", "calories": 190, "carbs_g": 23, "protein_g": 10, "fat_g": 6, "sugar_g": 0.5, "fiber_g": 1, "glycemic_index": 65, "category": "Indian rice dish"},
        {"name": "Dal Makhani", "calories": 140, "carbs_g": 15, "protein_g": 6, "fat_g": 7, "sugar_g": 1, "fiber_g": 3, "glycemic_index": 45, "category": "Indian lentil dish"},
        {"name": "Idli", "calories": 115, "carbs_g": 25, "protein_g": 3, "fat_g": 0.5, "sugar_g": 0, "fiber_g": 1, "glycemic_index": 60, "category": "Indian breakfast"},
        {"name": "Dosa", "calories": 160, "carbs_g": 28, "protein_g": 4, "fat_g": 4, "sugar_g": 0.5, "fiber_g": 1, "glycemic_index": 65, "category": "Indian breakfast"},
        {"name": "Masala Dosa", "calories": 185, "carbs_g": 29, "protein_g": 4.5, "fat_g": 6, "sugar_g": 1, "fiber_g": 1.5, "glycemic_index": 68, "category": "Indian breakfast"},
        {"name": "Paneer Butter Masala", "calories": 250, "carbs_g": 7, "protein_g": 12, "fat_g": 20, "sugar_g": 3, "fiber_g": 1, "glycemic_index": 20, "category": "Indian curry"},
        {"name": "Palak Paneer", "calories": 160, "carbs_g": 5, "protein_g": 9, "fat_g": 12, "sugar_g": 1.5, "fiber_g": 2, "glycemic_index": 15, "category": "Indian curry"},
        {"name": "Roti / Chapati", "calories": 297, "carbs_g": 55, "protein_g": 11, "fat_g": 3, "sugar_g": 1, "fiber_g": 3, "glycemic_index": 62, "category": "Indian bread"},
        {"name": "Naan", "calories": 260, "carbs_g": 45, "protein_g": 9, "fat_g": 5, "sugar_g": 2, "fiber_g": 2, "glycemic_index": 71, "category": "Indian bread"},
        {"name": "Samosa", "calories": 290, "carbs_g": 35, "protein_g": 4, "fat_g": 15, "sugar_g": 1, "fiber_g": 2, "glycemic_index": 70, "category": "Indian snack"},
        {"name": "Chicken Curry", "calories": 180, "carbs_g": 6, "protein_g": 16, "fat_g": 10, "sugar_g": 1.5, "fiber_g": 1, "glycemic_index": 10, "category": "Indian curry"},
        {"name": "Idli Sambar", "calories": 120, "carbs_g": 22, "protein_g": 4, "fat_g": 1, "sugar_g": 1.2, "fiber_g": 2, "glycemic_index": 55, "category": "Indian meal"},
        {"name": "Chole Bhature", "calories": 330, "carbs_g": 42, "protein_g": 9, "fat_g": 14, "sugar_g": 2.5, "fiber_g": 5, "glycemic_index": 68, "category": "Indian meal"},
        {"name": "Poha", "calories": 180, "carbs_g": 30, "protein_g": 3.5, "fat_g": 5, "sugar_g": 1, "fiber_g": 2, "glycemic_index": 70, "category": "Indian breakfast"},
        {"name": "Pongal", "calories": 165, "carbs_g": 26, "protein_g": 4.5, "fat_g": 5, "sugar_g": 0.5, "fiber_g": 2, "glycemic_index": 58, "category": "Indian meal"},
        {"name": "Upma", "calories": 170, "carbs_g": 28, "protein_g": 4, "fat_g": 5, "sugar_g": 1, "fiber_g": 2, "glycemic_index": 65, "category": "Indian breakfast"},
        {"name": "Rajma", "calories": 130, "carbs_g": 22, "protein_g": 8, "fat_g": 2, "sugar_g": 1, "fiber_g": 6, "glycemic_index": 29, "category": "Indian legume"},
        {"name": "Aloo Paratha", "calories": 220, "carbs_g": 35, "protein_g": 5, "fat_g": 8, "sugar_g": 1, "fiber_g": 2, "glycemic_index": 72, "category": "Indian bread"},
        {"name": "Bhindi Masala", "calories": 90, "carbs_g": 10, "protein_g": 3, "fat_g": 5, "sugar_g": 2, "fiber_g": 4, "glycemic_index": 20, "category": "Indian vegetable"},
        {"name": "Fish Curry", "calories": 150, "carbs_g": 5, "protein_g": 18, "fat_g": 7, "sugar_g": 1, "fiber_g": 1, "glycemic_index": 5, "category": "Indian curry"},
        {"name": "Egg Curry", "calories": 160, "carbs_g": 6, "protein_g": 12, "fat_g": 10, "sugar_g": 1.5, "fiber_g": 1, "glycemic_index": 8, "category": "Indian curry"},
        {"name": "Khichdi", "calories": 140, "carbs_g": 25, "protein_g": 5, "fat_g": 3, "sugar_g": 0.5, "fiber_g": 3, "glycemic_index": 50, "category": "Indian meal"},
        {"name": "Vada", "calories": 220, "carbs_g": 28, "protein_g": 7, "fat_g": 10, "sugar_g": 0.5, "fiber_g": 3, "glycemic_index": 65, "category": "Indian snack"},
        {"name": "Raita", "calories": 60, "carbs_g": 5, "protein_g": 4, "fat_g": 2, "sugar_g": 4, "fiber_g": 0.5, "glycemic_index": 35, "category": "Indian condiment"},
    ]


async def run_full_index() -> dict:
    """
    Main indexing pipeline:
    1. Fetch foods from Open Food Facts + USDA + static Indian foods
    2. Convert to embeddable chunks
    3. Upsert into ChromaDB 'nutrition_facts' collection
    Returns a summary dict.
    """
    from app.config import settings
    from app.services.rag_service import embed_and_upsert

    logger.info("Starting dataset auto-fetch and indexing...")
    all_foods: list[dict] = []

    # Always include static Indian foods
    all_foods.extend(get_static_indian_foods())

    # Fetch from Open Food Facts
    try:
        if settings.ENABLE_AUTO_DATASET_FETCH:
            off_foods = await fetch_open_food_facts(limit=2000)
            all_foods.extend(off_foods)
    except Exception as e:
        logger.error(f"Open Food Facts fetch failed: {e}")

    # Fetch from USDA if key is set
    try:
        if settings.USDA_API_KEY and settings.ENABLE_AUTO_DATASET_FETCH:
            usda_foods = await fetch_usda_foods(settings.USDA_API_KEY, limit=1000)
            all_foods.extend(usda_foods)
    except Exception as e:
        logger.error(f"USDA fetch failed: {e}")

    # Deduplicate by name
    seen = set()
    unique_foods = []
    for f in all_foods:
        key = f.get("name", "").lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique_foods.append(f)

    # Convert to embeddable text chunks
    chunks = []
    for food in unique_foods:
        chunk = _food_to_chunk(food)
        if chunk:
            chunks.append(chunk)

    # Upsert into ChromaDB
    if chunks:
        count = embed_and_upsert(chunks, settings.RAG_COLLECTION_NUTRITION)
        logger.info(f"Dataset indexing complete: {count} chunks in '{settings.RAG_COLLECTION_NUTRITION}'")
        return {"indexed": count, "total_foods": len(unique_foods)}
    else:
        logger.warning("No chunks to index")
        return {"indexed": 0, "total_foods": 0}
