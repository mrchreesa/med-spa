"""Celery application configuration."""

from celery import Celery

from app.config import settings

celery_app = Celery(
    "med_spa",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Security: Never send PHI in task payloads
    # Workers fetch data from DB using entity IDs only
    task_routes={
        "app.tasks.process_voicemail.*": {"queue": "voicemail"},
        "app.tasks.lead_follow_up.*": {"queue": "follow_up"},
        "app.tasks.send_notification.*": {"queue": "notifications"},
        "app.tasks.document_ingestion.*": {"queue": "ingestion"},
    },
)
