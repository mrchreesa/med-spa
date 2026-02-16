"""Seed the database with a test tenant and sample knowledge base document."""

import asyncio
import uuid

from sqlalchemy import text

from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.knowledge_document import KnowledgeDocument
from app.services.rag import RAGService

TEST_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_CLERK_ORG_ID = "test-org-001"

SAMPLE_TREATMENT_MENU = """
Glow Med Spa — Treatment Menu & Pricing

INJECTABLES
- Botox: $12 per unit. Treats fine lines, forehead wrinkles, crow's feet. Results visible in 7-14 days, lasts 3-4 months. Minimum 20 units recommended for forehead.
- Dysport: $4 per unit (uses more units than Botox for equivalent effect). Same areas as Botox. Some patients prefer the slightly softer look.
- Juvederm Ultra (lip filler): $650 per syringe. Adds volume and definition to lips. Results last 6-12 months.
- Juvederm Voluma (cheek filler): $850 per syringe. Restores volume to midface/cheeks. Results last up to 2 years.
- Kybella: $600 per vial. Dissolves fat under the chin (submental area). Typically 2-4 treatments needed, spaced 6 weeks apart.

SKIN TREATMENTS
- HydraFacial: $199. Deep cleansing, exfoliation, extraction, and hydration. No downtime. Great for all skin types.
- Chemical Peel (light): $150. Improves skin texture, reduces fine lines and mild discoloration.
- Chemical Peel (medium): $300. Deeper treatment for acne scars, sun damage, and wrinkles. 5-7 days of peeling.
- Microneedling: $350 per session. Stimulates collagen production. Recommended series of 3 treatments spaced 4-6 weeks apart.
- Microneedling with PRP: $550 per session. Enhanced results with platelet-rich plasma from your own blood.

LASER TREATMENTS
- IPL Photofacial: $350 per session. Treats sun spots, redness, broken capillaries. Series of 3 recommended.
- Laser Hair Removal: Starting at $150 per session (price varies by area). 6-8 sessions recommended for best results.
- Clear + Brilliant: $400 per session. Gentle laser for overall skin tone improvement and pore reduction.

BODY CONTOURING
- CoolSculpting: Starting at $750 per area. Non-invasive fat reduction. Results in 1-3 months. No downtime.
- EmSculpt NEO: $1,000 per session. Builds muscle and reduces fat simultaneously. Package of 4 recommended.

WELLNESS
- IV Therapy (Hydration): $150. Saline, electrolytes, B vitamins.
- IV Therapy (Beauty Drip): $250. Glutathione, biotin, vitamin C for skin glow.
- Vitamin B12 Injection: $35.

BUSINESS HOURS
Monday - Friday: 9:00 AM - 7:00 PM
Saturday: 10:00 AM - 5:00 PM
Sunday: Closed

LOCATION
123 Beauty Lane, Suite 100, Los Angeles, CA 90001
Phone: (555) 123-4567
"""


async def seed():
    async with async_session_factory() as db:
        # Check if tenant already exists
        existing = await db.get(Tenant, TEST_TENANT_ID)
        if existing:
            print(f"Test tenant already exists: {existing.name} (id={existing.id})")
        else:
            tenant = Tenant(
                id=TEST_TENANT_ID,
                clerk_org_id=TEST_CLERK_ORG_ID,
                name="Glow Med Spa",
                phone_number="(555) 123-4567",
                business_hours={
                    "monday": "9:00 AM - 7:00 PM",
                    "tuesday": "9:00 AM - 7:00 PM",
                    "wednesday": "9:00 AM - 7:00 PM",
                    "thursday": "9:00 AM - 7:00 PM",
                    "friday": "9:00 AM - 7:00 PM",
                    "saturday": "10:00 AM - 5:00 PM",
                    "sunday": "Closed",
                },
            )
            db.add(tenant)
            await db.commit()
            print(f"Created test tenant: Glow Med Spa (id={TEST_TENANT_ID})")

        # Ingest the sample treatment menu
        rag = RAGService(db)

        # Check if documents already exist for this tenant
        result = await db.execute(
            text("SELECT COUNT(*) FROM knowledge_documents WHERE tenant_id = :tid"),
            {"tid": str(TEST_TENANT_ID)},
        )
        count = result.scalar()
        if count and count > 0:
            print(f"Knowledge base already has {count} chunks — skipping.")
        else:
            print("Ingesting sample treatment menu...")
            docs = await rag.ingest_document(
                tenant_id=str(TEST_TENANT_ID),
                title="Treatment Menu & Pricing",
                content=SAMPLE_TREATMENT_MENU,
                doc_type="treatment_menu",
            )
            await db.commit()
            print(f"Ingested {len(docs)} chunks into knowledge base.")

    print()
    print("Seed complete! You can now test with:")
    print(f'  tenant_id: "{TEST_CLERK_ORG_ID}" (for embed widget)')
    print(f'  tenant_id: "{TEST_TENANT_ID}" (UUID)')


if __name__ == "__main__":
    asyncio.run(seed())
