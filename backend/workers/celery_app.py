from celery import Celery
from config import settings

celery_app = Celery(
    "vegrecipes",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "create-weekly-duels": {
            "task": "workers.tasks.create_weekly_duels",
            "schedule": 604800,  # every Sunday
        },
        "finish-old-duels": {
            "task": "workers.tasks.finish_old_duels",
            "schedule": 3600,
        },
        "update-es-index": {
            "task": "workers.tasks.reindex_all_recipes",
            "schedule": 86400,
        },
    },
)
