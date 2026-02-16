"""Prompt for generating conversation summaries."""

SUMMARY_GENERATOR_PROMPT = """Summarize the following conversation between an AI assistant and a patient \
at a medical spa. Focus on:
1. What the patient wanted
2. What information was provided
3. Any action items or follow-ups needed
4. Whether the conversation was escalated and why

Conversation:
{transcript}

Provide a concise 2-3 sentence summary."""
