"""Tests for RAG service — chunking logic only (embedding requires API keys)."""

import pytest

from app.services.rag import chunk_text


class TestChunking:
    def test_short_text_single_chunk(self):
        chunks = chunk_text("Hello world")
        assert len(chunks) == 1
        assert chunks[0] == "Hello world"

    def test_long_text_multiple_chunks(self):
        text = "word " * 200  # ~1000 chars, should produce multiple chunks
        chunks = chunk_text(text)
        assert len(chunks) > 1

    def test_respects_chunk_size(self):
        text = "A " * 1000
        chunks = chunk_text(text)
        for chunk in chunks:
            assert len(chunk) <= 600  # 512 + some tolerance for splitting

    def test_preserves_content(self):
        text = "Botox is a popular treatment. It costs $12 per unit."
        chunks = chunk_text(text)
        combined = " ".join(chunks)
        assert "Botox" in combined
        assert "$12" in combined

    def test_empty_text(self):
        chunks = chunk_text("")
        assert chunks == []

    def test_splits_on_paragraphs(self):
        paragraphs = ["Paragraph one. " * 30, "Paragraph two. " * 30]
        text = "\n\n".join(paragraphs)
        chunks = chunk_text(text)
        assert len(chunks) >= 2
