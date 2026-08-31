"""
backend/app/services/rag_service.py
RAG service using Supabase pgvector + Hybrid Search + Cross-Encoder reranking.
Collections mapped to pgvector tables: "nutrition_facts", "diabetes_guidelines"
"""
import logging
from typing import Optional, List
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

_embedding_model = None
_cross_encoder = None
_supabase_client = None

def _get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client, Client
        from app.config import settings
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase_client

def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded: all-MiniLM-L6-v2")
    return _embedding_model

def _get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None:
        _cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        logger.info("Cross-Encoder model loaded: ms-marco-MiniLM-L-6-v2")
    return _cross_encoder


def chunk_text(docs: list[str]) -> list[str]:
    """Split large documents into overlapping chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunked = []
    for doc in docs:
        chunked.extend(splitter.split_text(doc))
    return chunked


def embed_and_upsert(docs: list[str], collection_name: str, ids: Optional[list[str]] = None) -> int:
    """Embed text docs and upsert into Supabase pgvector table."""
    if not docs:
        return 0
    try:
        # 1. Chunking
        chunked_docs = chunk_text(docs)
        
        # 2. Embedding
        model = _get_embedding_model()
        embeddings = model.encode(chunked_docs, show_progress_bar=False).tolist()
        
        # 3. Upsert to Supabase
        client = _get_supabase_client()
        table_name = "nutrition_facts_embeddings" if collection_name == "nutrition_facts" else "diabetes_guidelines_embeddings"
        
        batch_size = 100
        count = 0
        for i in range(0, len(chunked_docs), batch_size):
            batch_docs = chunked_docs[i:i+batch_size]
            batch_embs = embeddings[i:i+batch_size]
            
            data = [
                {"content": doc, "embedding": emb, "metadata": {}}
                for doc, emb in zip(batch_docs, batch_embs)
            ]
            client.table(table_name).insert(data).execute()
            count += len(batch_docs)
            
        logger.info(f"Upserted {count} chunks into '{table_name}'")
        return count
    except Exception as e:
        logger.error(f"embed_and_upsert failed for '{collection_name}': {e}")
        return 0


def retrieve(query: str, collection_name: str, k: int = 5, user_id: str = None) -> list[str]:
    """
    Return top-k relevant docs using Hybrid Search + Cross-Encoder reranking.
    """
    try:
        client = _get_supabase_client()
        model = _get_embedding_model()
        cross_encoder = _get_cross_encoder()
        
        rpc_name = "match_nutrition_hybrid" if collection_name == "nutrition_facts" else "match_guidelines_hybrid"
        
        # 1. Embed query
        q_emb = model.encode(query, show_progress_bar=False).tolist()
        
        # 2. Hybrid Search (Semantic + BM25) via Supabase RPC (Retrieve top 20)
        res = client.rpc(rpc_name, {
            "query_text": query,
            "query_embedding": q_emb,
            "match_count": 20
        }).execute()
        
        if not res.data:
            return []
            
        candidates = [item["content"] for item in res.data]
        
        # 3. Cross-Encoder Re-ranking
        # Create pairs of (query, candidate)
        cross_inp = [[query, cand] for cand in candidates]
        scores = cross_encoder.predict(cross_inp)
        
        # Sort candidates by score descending
        ranked_candidates = [cand for _, cand in sorted(zip(scores, candidates), reverse=True)]
        
        # Return top K
        return ranked_candidates[:k]
        
    except Exception as e:
        logger.error(f"retrieve failed for '{collection_name}': {e}")
        return []


def collection_count(collection_name: str) -> int:
    try:
        client = _get_supabase_client()
        table_name = "nutrition_facts_embeddings" if collection_name == "nutrition_facts" else "diabetes_guidelines_embeddings"
        res = client.table(table_name).select("id", count="exact").limit(1).execute()
        return res.count if res.count is not None else 0
    except Exception:
        return 0


def seed_diabetes_guidelines() -> bool:
    """Embed curated diabetes guidelines into Supabase (idempotent)."""
    from app.config import settings
    col_name = settings.RAG_COLLECTION_GUIDELINES
    
    if collection_count(col_name) > 10:
        logger.info(f"Guidelines already seeded ({collection_count(col_name)} docs)")
        return True

    guidelines = [
        "Glycemic Index (GI) measures how quickly foods raise blood glucose. Low GI 0-55 (slow spike), Medium GI 56-69, High GI 70+ (rapid spike). Diabetics should prefer low-GI foods.",
        "Glycemic Load (GL) = (GI x carbs_g) / 100. Low GL < 10, Medium GL 11-19, High GL >= 20. Even high-GI foods can have low GL if eaten in small portions.",
        "White rice GI ~72 (high). Brown rice GI ~50. Whole wheat bread GI ~51. White bread GI ~75. Oats GI ~55. Lentils GI ~29. Sweet potato GI ~54.",
        "ADA glucose targets for adults with diabetes: Fasting 80-130 mg/dL. 2h post-meal < 180 mg/dL. HbA1c target < 7%.",
        "Hypoglycemia: blood glucose < 70 mg/dL. Treat with 15g fast-acting carbs, recheck in 15 min.",
        "Hyperglycemia: blood glucose > 180 mg/dL. Monitor more frequently, stay hydrated, contact doctor if persistent.",
        "Time in Range target: 70-180 mg/dL > 70% of time for most diabetics.",
        "Fiber slows glucose absorption. Target 25-38g fiber/day. High-fiber foods: oats, legumes, leafy greens, chia seeds.",
        "The plate method: half plate non-starchy vegetables, quarter lean protein, quarter complex carbs. Limits carbs to 45-60g per meal.",
        "Low-carb diet < 130g carbs/day can significantly reduce HbA1c in type 2 diabetes.",
        "A 10-minute walk after meals reduces post-meal glucose spikes by 22%. Target 150 min/week moderate exercise.",
        "Stress raises blood glucose via cortisol. Meditation, yoga, and breathing exercises directly benefit glucose control.",
        "Sleep deprivation < 6 hours increases insulin resistance. Target 7-8 hours quality sleep.",
        "Even 5-10% weight loss improves blood glucose control significantly in type 2 diabetes.",
        "Indian foods: dal (lentils) GI 29-48 excellent for diabetics. Roti GI 62 moderate. White rice GI 72 limit portions. Idli GI 60 better fermented.",
        "Bitter gourd (karela) lowers blood glucose. Fenugreek seeds slow glucose absorption.",
        "Best diabetes foods: leafy greens GI ~15, berries, fatty fish (no carbs). Worst: sugary drinks, white bread, pastries, fried foods.",
        "Alcohol can cause hypoglycemia hours after consumption. Never drink on empty stomach. Max 1-2 drinks/day.",
        "Apple cider vinegar 1-2 tbsp before meals reduces post-meal glucose spikes by 19-34% by slowing gastric emptying.",
        "Resistant starch: cooling cooked rice/pasta forms resistant starch, lowers glycemic response by up to 40%.",
        "HbA1c reflects 3-month average glucose. Each 1% reduction cuts eye disease risk by 35%, kidney disease by 20-25%.",
        "Metformin (first-line type 2): reduces liver glucose production. Take with food to reduce GI side effects.",
        "GLP-1 agonists (semaglutide/Ozempic) lower blood sugar, promote weight loss, have cardiovascular benefits.",
        "SGLT2 inhibitors (empagliflozin) lower glucose via urine excretion. Benefit: weight loss and heart protection.",
        "Foot care: check feet daily for cuts, blisters, redness. Neuropathy reduces sensation. Never walk barefoot.",
        "Annual diabetes checks: HbA1c every 3 months, kidney function, eye exam, foot exam, cholesterol, blood pressure.",
        "Intermittent fasting 16:8 shows promise for type 2 diabetes - reduced HbA1c and improved insulin sensitivity. Consult doctor if on medications.",
        "Masala chai with milk adds 8-12g carbs per cup. Prefer green tea or black tea without sugar. Turmeric improves insulin sensitivity.",
        "Insulin types: Rapid-acting (lispro, aspart) peaks 1-2h used at meals. Long-acting (glargine) flat 24h basal profile.",
        "The dawn phenomenon: glucose rises 4-8am due to cortisol even without eating. Adjust basal insulin timing if morning readings high.",
        "Carb counting: 15g = 1 carb serving. Diabetic meal 3-4 servings (45-60g). Snacks 1-2 servings (15-30g).",
        "Artificial sweeteners (stevia, erythritol, allulose) do not raise blood glucose and are safe for diabetics.",
        
        # Advanced Medical & Glucose Metabolism
        "Insulin Resistance Mechanism: Excess visceral fat releases inflammatory cytokines (TNF-alpha, IL-6) which interfere with insulin receptor signaling pathways (IRS-1/PI3K), preventing glucose from entering muscle cells.",
        "Macronutrient Combining: Consuming protein or fat 15 minutes before carbohydrates significantly delays gastric emptying and reduces the postprandial glucose spike by up to 30% compared to eating carbs first.",
        "Somogyi Effect: Rebound hyperglycemia in the morning caused by undetected hypoglycemia during the night. The body releases counter-regulatory hormones (glucagon, epinephrine, cortisol) to rescue the low blood sugar, resulting in a morning spike.",
        "Dawn Phenomenon vs Somogyi: To distinguish, check blood glucose at 3 AM. If low at 3 AM and high in morning, it's Somogyi. If normal/high at 3 AM and higher in morning, it's Dawn Phenomenon.",
        "HbA1c to Average Glucose (eAG) Conversion: eAG (mg/dL) = (28.7 x A1C) - 46.7. For example, an A1C of 7.0% corresponds to an estimated average glucose of 154 mg/dL.",
        "Kidney Threshold for Glucose: The kidneys typically reabsorb all filtered glucose. When blood glucose exceeds ~180 mg/dL (the renal threshold), the SGLT transporters are saturated, and glucose spills into the urine (glucosuria).",
        "Exercise and GLUT4: Muscle contraction during physical activity triggers insulin-independent translocation of GLUT4 transporters to the cell membrane. This means exercise lowers blood glucose even if insulin levels are very low or insulin resistance is high.",
        "Cortisol Impact: Acute stress spikes cortisol, which stimulates hepatic gluconeogenesis (liver makes new glucose) and induces temporary severe insulin resistance in muscle tissues.",
        "Glucagon-Like Peptide-1 (GLP-1): An incretin hormone secreted by the intestine after eating. It stimulates insulin release, inhibits glucagon release, slows gastric emptying, and increases satiety. People with type 2 diabetes often have diminished incretin effect.",
        "Gastroparesis in Diabetes: Long-term elevated glucose can damage the vagus nerve, leading to delayed stomach emptying (gastroparesis). This makes meal-time insulin dosing very difficult because food absorbs unpredictably.",
        "Diabetic Ketoacidosis (DKA): Occurs primarily in Type 1 when absolute insulin deficiency causes the body to rapidly break down fat for energy, producing acidic ketones. Symptoms: fruity breath, Kussmaul respirations, nausea. Medical emergency.",
        "Hyperosmolar Hyperglycemic State (HHS): Occurs primarily in Type 2. Extreme hyperglycemia (>600 mg/dL) causing severe dehydration and altered mental status, but without significant ketones (because there is just enough insulin to prevent fat breakdown).",
        "Beta Cell Exhaustion: In Type 2 diabetes, years of over-producing insulin to overcome insulin resistance eventually leads to beta cell apoptosis (death) in the pancreas, requiring exogenous insulin therapy in late stages.",
        "Fat and Protein Spikes: While carbs spike glucose in 1-2 hours, large amounts of dietary fat and protein can cause delayed, prolonged glucose rises 3-6 hours after a meal via delayed gastric emptying and gluconeogenesis.",
        "Alcohol-Induced Hypoglycemia: Alcohol blocks hepatic gluconeogenesis (the liver's ability to release glucose). If a diabetic takes insulin or secretagogues, alcohol can cause severe, prolonged hypoglycemia that doesn't respond to glucagon emergency kits."
    ]

    try:
        count = embed_and_upsert(guidelines, col_name)
        logger.info(f"Seeded {count} diabetes guidelines chunks into '{col_name}'")
        return True
    except Exception as e:
        logger.error(f"Failed to seed diabetes guidelines: {e}")
        return False
