"""
backend/app/services/scheduler.py

APScheduler background job scheduler.
Jobs:
  - run_full_index()     : every 12h — fetch datasets from APIs, re-index ChromaDB
  - retrain_all_users()  : every 6h  — retrain personal glucose spike prediction models
"""
import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _safe_run_dataset_index():
    """Wrapper that catches all errors so the scheduler never crashes."""
    try:
        from app.services.dataset_fetcher import run_full_index
        logger.info("⏰ Scheduler: Starting dataset auto-fetch and index...")
        result = await run_full_index()
        logger.info(f"⏰ Scheduler: Dataset index complete — {result}")
    except Exception as e:
        logger.error(f"⏰ Scheduler: Dataset index failed — {e}")


async def _safe_retrain_models():
    """Wrapper that catches all errors so the scheduler never crashes."""
    try:
        from app.services.prediction_service import retrain_all_users
        logger.info("⏰ Scheduler: Starting model retraining...")
        result = await retrain_all_users()
        logger.info(f"⏰ Scheduler: Model retraining complete — {result}")
    except Exception as e:
        logger.error(f"⏰ Scheduler: Model retraining failed — {e}")


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


def start_scheduler():
    """Start the APScheduler with all background jobs."""
    scheduler = get_scheduler()

    # Dataset indexing every 12 hours
    scheduler.add_job(
        _safe_run_dataset_index,
        trigger=IntervalTrigger(hours=12),
        id="dataset_index",
        name="Auto Dataset Fetch & Index",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # Model retraining every 6 hours
    scheduler.add_job(
        _safe_retrain_models,
        trigger=IntervalTrigger(hours=6),
        id="model_retrain",
        name="Personal Prediction Model Retrain",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info("✅ APScheduler started (dataset index: 12h, model retrain: 6h)")
    return scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")


async def trigger_initial_index():
    """Run the initial dataset index in background without blocking startup."""
    async def _run():
        await asyncio.sleep(5)  # Small delay to let FastAPI fully start
        await _safe_run_dataset_index()
        await _safe_retrain_models()

    asyncio.create_task(_run())
    logger.info("Initial dataset index scheduled (starts in 5s)")
