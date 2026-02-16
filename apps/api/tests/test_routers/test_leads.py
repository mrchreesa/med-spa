"""Tests for leads CRUD endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_leads_empty(client):
    response = await client.get("/api/v1/leads")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total_count"] == 0


@pytest.mark.asyncio
async def test_list_leads_with_data(client, lead):
    response = await client.get("/api/v1/leads")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total_count"] == 1
    assert data["items"][0]["id"] == str(lead.id)
    assert data["items"][0]["source"] == "web_chat"
    assert data["items"][0]["status"] == "new"


@pytest.mark.asyncio
async def test_get_lead(client, lead):
    response = await client.get(f"/api/v1/leads/{lead.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(lead.id)
    assert data["summary"] == "Interested in Botox treatment"


@pytest.mark.asyncio
async def test_get_lead_not_found(client):
    response = await client.get("/api/v1/leads/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_lead_status(client, lead):
    response = await client.patch(
        f"/api/v1/leads/{lead.id}",
        json={"status": "contacted"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "contacted"


@pytest.mark.asyncio
async def test_update_lead_not_found(client):
    response = await client.patch(
        "/api/v1/leads/00000000-0000-0000-0000-000000000000",
        json={"status": "contacted"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_leads_with_status_filter(client, lead):
    # Filter for "new" — should find the lead
    response = await client.get("/api/v1/leads?status=new")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total_count"] == 1

    # Filter for "booked" — should be empty
    response = await client.get("/api/v1/leads?status=booked")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 0
    assert data["total_count"] == 0
