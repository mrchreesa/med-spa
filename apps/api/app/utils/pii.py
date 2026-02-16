"""PII detection and masking utilities."""

import re


# Patterns for common PII
PHONE_PATTERN = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")


def mask_pii(text: str) -> str:
    """Mask PII in text for safe logging."""
    text = PHONE_PATTERN.sub("[PHONE]", text)
    text = EMAIL_PATTERN.sub("[EMAIL]", text)
    text = SSN_PATTERN.sub("[SSN]", text)
    return text


def detect_pii(text: str) -> list[dict[str, str]]:
    """Detect PII entities in text."""
    findings: list[dict[str, str]] = []

    for match in PHONE_PATTERN.finditer(text):
        findings.append({"type": "phone", "value": match.group(), "start": str(match.start())})

    for match in EMAIL_PATTERN.finditer(text):
        findings.append({"type": "email", "value": match.group(), "start": str(match.start())})

    for match in SSN_PATTERN.finditer(text):
        findings.append({"type": "ssn", "value": match.group(), "start": str(match.start())})

    return findings
