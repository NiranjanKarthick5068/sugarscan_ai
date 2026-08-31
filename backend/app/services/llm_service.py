import json
import re
from typing import AsyncGenerator
import httpx
from app.config import settings

SAFE_DEFAULTS = {
    "food_name": "Unknown Food",
    "food_category": "Unknown",
    "ingredients": [],
    "estimated_weight_g": 100.0,
    "serving_size": "1 serving",
    "confidence_score": 0.3,
    "nutrition_data": {
        "calories": 200.0,
        "carbs_g": 25.0,
        "protein_g": 8.0,
        "fat_g": 7.0,
        "sugar_g": 5.0,
        "fiber_g": 2.0,
    },
    "glycemic_data": {
        "glycemic_index": 55.0,
        "glycemic_load": 14.0,
        "estimated_spike_mg_dl": 30.0,
        "diabetes_safety_score": 60,
    },
    "risk_level": "moderate",
    "recommendations": [
        "Consult with your dietitian for personalized advice.",
        "Monitor your blood glucose 2 hours after eating.",
    ],
    "alternatives": [],
    "is_estimate_fallback": True,
}

SYSTEM_PROMPT = (
    "You are a clinical nutrition AI specialized in diabetes management. "
    "You MUST respond with ONLY valid JSON. No explanation, no markdown, just JSON."
)

CHAT_SYSTEM_PROMPT = (
    "You are SugarScan AI, a personal AI Twin and clinical assistant for diabetes management. "
    "CRITICAL RULES:\n"
    "1. You HAVE FULL ACCESS to the user's past medical records, recent meals, and glucose data provided in this prompt. You MUST use this data to answer questions. NEVER say you don't have access to past interactions or medical records.\n"
    "2. Respond conversationally as a helpful assistant.\n"
    "3. Keep your responses EXTREMELY short. Use only 1-2 sentences maximum.\n"
    "4. NEVER use formatting like markdown, asterisks, or bold text.\n"
    "5. If the user asks about a past meal, look at the 'Recent Meals Logged' data below and tell them about it directly."
)

VOICE_SYSTEM_PROMPT = (
    "You are a personal voice assistant. Keep answers EXTREMELY short (1 sentence max). "
    "Respond naturally without formatting, asterisks, or markdown. "
    "If the user says 'Hi' or 'Hello', simply say 'Hi, how can I help?'. Do not give long text."
)


def _build_nutrition_prompt(vision_output: str, health_profile: dict, reference_data: dict | None, rag_context: str = "") -> str:
    factual_ref = ""
    if reference_data:
        factual_ref = f"FACTUAL NUTRITION REFERENCE (per 100g):\n{json.dumps(reference_data, indent=2)}\nIMPORTANT: Use this factual data for macros and glycemic index instead of estimating."

    rag_section = ""
    if rag_context:
        rag_section = f"\n\n{rag_context}\nUse the above database entries to calibrate your nutritional estimates — they contain verified real-world data."

    return f"""Given this food description: {vision_output}

Patient health context:
- Diabetes type: {health_profile.get('diabetes_type', 'type2')}
- Target glucose range: {health_profile.get('target_glucose_min', 70)}-{health_profile.get('target_glucose_max', 140)} mg/dL
- Dietary restrictions: {health_profile.get('dietary_restrictions', [])}

{factual_ref}{rag_section}

Respond with ONLY this JSON structure (no markdown, no explanation):
{{
  "food_name": "string",
  "food_category": "string",
  "ingredients": ["string"],
  "estimated_weight_g": number,
  "serving_size": "string",
  "confidence_score": number,
  "nutrition_data": {{
    "calories": number,
    "carbs_g": number,
    "protein_g": number,
    "fat_g": number,
    "sugar_g": number,
    "fiber_g": number
  }},
  "glycemic_data": {{
    "glycemic_index": number,
    "glycemic_load": number,
    "estimated_spike_mg_dl": number,
    "diabetes_safety_score": number
  }},
  "risk_level": "low",
  "recommendations": ["string"],
  "alternatives": [{{"name": "string", "reason": "string"}}]
}}"""


def _parse_json_response(raw: str) -> dict | None:
    """Extract and parse JSON from a potentially noisy LLM response."""
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Try to find JSON object in the text
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


async def analyze_nutrition(
    vision_output: str,
    health_profile: dict,
    reference_data: dict | None = None,
    rag_context: str = "",
) -> dict:
    """
    Calls Ollama phi3:mini to analyze nutrition from vision output.
    RAG context from ChromaDB is injected into the prompt for grounded analysis.
    Returns parsed dict with all nutrition/glycemic fields.
    """
    prompt = _build_nutrition_prompt(vision_output, health_profile, reference_data, rag_context)
    payload = {
        "model": settings.OLLAMA_LLM_MODEL,
        "system": SYSTEM_PROMPT,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1},
    }

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json=payload,
                )
                response.raise_for_status()
                raw = response.json().get("response", "")

            result = _parse_json_response(raw)
            if result:
                return result

            if attempt == 0:
                # Retry with stricter instruction
                payload["prompt"] = (
                    f"Previous response was not valid JSON. "
                    f"Food: {vision_output[:200]}. "
                    "Return ONLY a JSON object with keys: food_name, food_category, "
                    "ingredients, estimated_weight_g, serving_size, confidence_score, "
                    "nutrition_data, glycemic_data, risk_level, recommendations, alternatives."
                )
        except Exception:
            if attempt == 1:
                break

    return SAFE_DEFAULTS.copy()


async def stream_chat(
    messages: list[dict],
    system_prompt: str = CHAT_SYSTEM_PROMPT,
    is_voice: bool = False,
    rag_context: str = "",
) -> AsyncGenerator[str, None]:
    if is_voice:
        system_prompt = VOICE_SYSTEM_PROMPT
        if messages and messages[0].get("role") == "system":
            messages[0]["content"] = system_prompt
    elif rag_context:
        # Inject RAG context into the system prompt for grounded chat
        enhanced_system = (
            f"{system_prompt}\n\n"
            f"EVIDENCE BASE (use these facts when relevant — do not contradict them):\n"
            f"{rag_context}"
        )
        if messages and messages[0].get("role") == "system":
            messages[0]["content"] = enhanced_system
        system_prompt = enhanced_system

    payload = {
        "model": settings.OLLAMA_MINI_MODEL if is_voice else settings.OLLAMA_CHAT_MODEL,
        "system": system_prompt,
        "messages": messages,
        "stream": True,
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, read=120.0)) as client:
            async with client.stream(
                "POST", f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    token = data.get("message", {}).get("content", "") or data.get("response", "")
                    if token:
                        yield token
                    if data.get("done"):
                        break
    except httpx.ConnectError as e:
        raise RuntimeError(f"Cannot reach Ollama at {settings.OLLAMA_BASE_URL} — is it running?") from e
    except httpx.TimeoutException as e:
        raise RuntimeError("Ollama took too long to respond.") from e


async def generate_dashboard_insight(data: dict) -> str:
    """
    Generates a short, 1-2 sentence AI insight based on the user's dashboard data.
    """
    prompt = f"""
    Analyze the user's recent diabetes management data and provide a concise, 1-2 sentence encouraging insight or actionable advice. 
    Be supportive and conversational. DO NOT use markdown.

    Data:
    - Average Glucose: {data.get("glucose", {}).get("avg", "Unknown")} mg/dL
    - Time in Range (70-140 mg/dL): {data.get("glucose", {}).get("tir", "Unknown")}%
    - Recent high-risk meals: {data.get("scans", {}).get("high_risk_meals", 0)}
    - Total recent meals logged: {len(data.get("recent_scans", []))}
    """

    payload = {
        "model": settings.OLLAMA_MINI_MODEL,
        "system": "You are a friendly AI diabetes assistant. Keep your response to 1-2 sentences maximum. Do not use formatting like bold or bullet points.",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            text = response.json().get("response", "").strip()
            return text if text else "Keep up the good work tracking your health!"
    except Exception as e:
        print(f"Failed to generate AI insight: {e}")
        return "Keep up the good work tracking your health! Log more data for personalized insights."


async def generate_ai_twin_predictions(data: dict) -> list[dict]:
    """
    Generates 2 structured AI predictions for the AI Twin tab based on dashboard data.
    """
    prompt = f"""
    Analyze the user's recent diabetes management data and provide exactly 2 health predictions.
    
    Data:
    - Average Glucose: {data.get("glucose", {}).get("avg", "Unknown")} mg/dL
    - Time in Range (70-140 mg/dL): {data.get("glucose", {}).get("tir", "Unknown")}%
    - Recent high-risk meals: {data.get("scans", {}).get("high_risk_meals", 0)}

    Respond with ONLY a JSON array of exactly 2 objects (no markdown):
    [
      {{"text": "string (the prediction)", "risk": "low" | "medium" | "high"}}
    ]
    """

    payload = {
        "model": settings.OLLAMA_MINI_MODEL,
        "system": "You are a clinical nutrition AI. You MUST respond with ONLY valid JSON array. No markdown, no explanation.",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            text = response.json().get("response", "").strip()
            
            # Extract JSON array
            match = re.search(r"\[.*\]", text.replace("\n", ""))
            if match:
                return json.loads(match.group(0))
            
            # fallback parse
            return json.loads(text)
    except Exception as e:
        print(f"Failed to generate AI predictions: {e}")
        return [
            {"text": "Continue logging your meals to see how they impact your glucose.", "risk": "low"},
            {"text": "Your metabolism is stabilizing. Stay hydrated today.", "risk": "low"}
        ]
