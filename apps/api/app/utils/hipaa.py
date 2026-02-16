"""HIPAA compliance utilities."""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def log_phi_access(
    user_id: str,
    tenant_id: str,
    resource_type: str,
    resource_id: str,
    action: str,
) -> None:
    """Log PHI access for HIPAA audit trail.

    All PHI access must be logged with:
    - Who accessed it (user_id)
    - What was accessed (resource_type, resource_id)
    - When (timestamp)
    - What action was taken
    """
    logger.info(
        "phi_access",
        extra={
            "user_id": user_id,
            "tenant_id": tenant_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
