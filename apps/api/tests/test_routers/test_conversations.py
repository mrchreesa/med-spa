"""Tests for conversation endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_conversations_empty(client):
    response = await client.get("/api/v1/conversations")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total_count"] == 0


@pytest.mark.asyncio
async def test_list_conversations_with_data(client, conversation):
    response = await client.get("/api/v1/conversations")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total_count"] == 1
    assert data["items"][0]["id"] == str(conversation.id)
    assert data["items"][0]["channel"] == "web_chat"


@pytest.mark.asyncio
async def test_get_conversation(client, conversation):
    response = await client.get(f"/api/v1/conversations/{conversation.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(conversation.id)
    assert len(data["transcript"]) == 2
    assert data["transcript"][0]["role"] == "user"


@pytest.mark.asyncio
async def test_get_conversation_not_found(client):
    response = await client.get("/api/v1/conversations/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
