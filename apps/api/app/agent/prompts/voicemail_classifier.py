"""Prompt for classifying voicemail intent."""

VOICEMAIL_CLASSIFIER_PROMPT = """Analyze the following voicemail transcript and classify the caller's intent.

Transcript: {transcript}

Classify into one of these categories:
- appointment: Wants to schedule, reschedule, or cancel an appointment
- pricing: Asking about costs or payment
- treatment_info: Asking about a specific treatment or service
- complaint: Expressing dissatisfaction
- emergency: Describing a medical concern that needs immediate attention
- general: Other inquiries

Also provide:
- urgency (1-5, where 5 is most urgent)
- summary (1-2 sentence summary of the voicemail)
- extracted_name (caller's name if mentioned)
- extracted_phone (callback number if mentioned)

Respond in JSON format."""
