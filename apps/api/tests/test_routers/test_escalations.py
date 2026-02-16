"""Tests for escalation CRUD endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_escalations_empty(client):
    response = await client.get("/api/v1/escalations")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total_count"] == 0


@pytest.mark.asyncio
async def test_list_escalations_with_data(client, escalation):
    response = await client.get("/api/v1/escalations")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total_count"] == 1
    assert data["items"][0]["id"] == str(escalation.id)
    assert data["items"][0]["reason"] == "medical_question"
    assert data["items"][0]["status"] == "pending"


@pytest.mark.asyncio
async def test_create_escalation(client, conversation):
    response = await client.post(
        "/api/v1/escalations",
        json={
            "conversation_id": str(conversation.id),
            "reason": "complaint",
            "notes": "Patient unhappy with results",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reason"] == "complaint"
    assert data["status"] == "pending"
    assert data["notes"] == "Patient unhappy with results"


@pytest.mark.asyncio
async def test_update_escalation_resolve(client, escalation):
    response = await client.patch(
        f"/api/v1/escalations/{escalation.id}",
        json={"status": "resolved", "notes": "Resolved via phone call"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "resolved"
    assert data["notes"] == "Resolved via phone call"


@pytest.mark.asyncio
async def test_update_escalation_not_found(client):
    response = await client.patch(
        "/api/v1/escalations/00000000-0000-0000-0000-000000000000",
        json={"status": "resolved"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_escalations_with_status_filter(client, escalation):
    response = await client.get("/api/v1/escalations?status=pending")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total_count"] == 1

    response = await client.get("/api/v1/escalations?status=resolved")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 0
    assert data["total_count"] == 0
