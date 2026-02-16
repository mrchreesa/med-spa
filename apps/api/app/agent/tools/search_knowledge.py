"""Knowledge base search tool for the LangGraph agent."""

from langchain_core.tools import tool

from app.database import async_session_factory
from app.services.rag import RAGService


@tool
async def search_knowledge_base(query: str, tenant_id: str) -> str:
    """Search the spa's knowledge base for relevant information about treatments, pricing, and FAQs.

    Args:
        query: The search query based on the patient's question.
        tenant_id: The tenant identifier for the spa.

    Returns:
        Relevant context from the knowledge base, or a message if nothing found.
    """
    async with async_session_factory() as db:
        rag = RAGService(db)
        return await rag.format_context(tenant_id, query)
