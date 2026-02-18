"""Dev Health Dashboard API endpoints."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Query
from sqlalchemy import text

from app.deps import DbSession, DevRole

router = APIRouter(prefix="/dev", dependencies=[DevRole])


def _cutoff(hours: int) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours)


# ---------- Overview ----------


@router.get("/overview")
async def dev_overview(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
):
    """Summary KPIs for the dev dashboard."""
    cutoff = _cutoff(hours)

    # Agent run stats  -- noqa: E501 (SQL)
    run_result = await db.execute(
        text(
            "SELECT"
            " COUNT(*) as total_runs,"
            " COALESCE(AVG(total_duration_ms),0) as avg_latency,"
            " COALESCE(SUM(total_tokens),0) as total_tokens,"
            " COALESCE(SUM(total_cost_usd),0) as total_cost,"
            " COALESCE(AVG(CASE WHEN error THEN 1.0 ELSE 0.0 END)*100,0)"
            " as error_rate,"
            " COALESCE(AVG(CASE WHEN was_escalated THEN 1.0 ELSE 0.0 END)"
            " *100,0) as escalation_rate,"
            " COALESCE(percentile_cont(0.50) WITHIN GROUP"
            " (ORDER BY total_duration_ms),0) as p50_latency,"
            " COALESCE(percentile_cont(0.95) WITHIN GROUP"
            " (ORDER BY total_duration_ms),0) as p95_latency,"
            " COALESCE(percentile_cont(0.99) WITHIN GROUP"
            " (ORDER BY total_duration_ms),0) as p99_latency"
            " FROM agent_run_metrics"
            " WHERE created_at >= :cutoff"
        ),
        {"cutoff": cutoff},
    )
    run_row = run_result.fetchone()

    # RAG similarity
    rag_result = await db.execute(
        text("""
            SELECT COALESCE(AVG(avg_similarity), 0) as avg_rag_similarity
            FROM rag_retrieval_metrics
            WHERE created_at >= :cutoff AND avg_similarity IS NOT NULL
        """),
        {"cutoff": cutoff},
    )
    rag_row = rag_result.fetchone()

    return {
        "period_hours": hours,
        "total_runs": run_row.total_runs,
        "avg_latency_ms": round(float(run_row.avg_latency), 1),
        "total_tokens": int(run_row.total_tokens),
        "total_cost_usd": round(float(run_row.total_cost), 4),
        "error_rate": round(float(run_row.error_rate), 2),
        "escalation_rate": round(float(run_row.escalation_rate), 2),
        "avg_rag_similarity": round(float(rag_row.avg_rag_similarity), 4),
        "p50_latency_ms": round(float(run_row.p50_latency), 1),
        "p95_latency_ms": round(float(run_row.p95_latency), 1),
        "p99_latency_ms": round(float(run_row.p99_latency), 1),
    }


# ---------- LLM ----------


@router.get("/llm/timeseries")
async def llm_timeseries(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
    interval: str = Query("hour", pattern="^(hour|day)$"),
):
    """Time-bucketed LLM stats."""
    cutoff = _cutoff(hours)
    trunc = "hour" if interval == "hour" else "day"

    result = await db.execute(
        text("""
            SELECT
                date_trunc(:trunc, created_at) as bucket,
                COUNT(*) as calls,
                COALESCE(SUM(total_tokens), 0) as tokens,
                COALESCE(SUM(cost_usd), 0) as cost,
                COALESCE(AVG(latency_ms), 0) as avg_latency,
                SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as errors
            FROM llm_call_metrics
            WHERE created_at >= :cutoff
            GROUP BY bucket
            ORDER BY bucket
        """),
        {"cutoff": cutoff, "trunc": trunc},
    )
    rows = result.fetchall()

    return [
        {
            "time": row.bucket.isoformat(),
            "calls": row.calls,
            "tokens": int(row.tokens),
            "cost": round(float(row.cost), 6),
            "avg_latency_ms": round(float(row.avg_latency), 1),
            "errors": row.errors,
        }
        for row in rows
    ]


@router.get("/llm/breakdown")
async def llm_breakdown(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
):
    """Per-model LLM stats."""
    cutoff = _cutoff(hours)

    result = await db.execute(
        text(
            "SELECT model, COUNT(*) as calls,"
            " COALESCE(SUM(total_tokens),0) as tokens,"
            " COALESCE(SUM(cost_usd),0) as cost,"
            " COALESCE(AVG(latency_ms),0) as avg_latency,"
            " COALESCE(percentile_cont(0.95) WITHIN GROUP"
            " (ORDER BY latency_ms),0) as p95_latency,"
            " COALESCE(AVG(CASE WHEN NOT success"
            " THEN 1.0 ELSE 0.0 END)*100,0) as error_rate"
            " FROM llm_call_metrics"
            " WHERE created_at >= :cutoff"
            " GROUP BY model ORDER BY calls DESC"
        ),
        {"cutoff": cutoff},
    )
    rows = result.fetchall()

    return [
        {
            "model": row.model,
            "calls": row.calls,
            "tokens": int(row.tokens),
            "cost": round(float(row.cost), 6),
            "avg_latency_ms": round(float(row.avg_latency), 1),
            "p95_latency_ms": round(float(row.p95_latency), 1),
            "error_rate": round(float(row.error_rate), 2),
        }
        for row in rows
    ]


# ---------- Agent ----------


@router.get("/agent/runs")
async def agent_runs(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Paginated agent runs list."""
    cutoff = _cutoff(hours)

    result = await db.execute(
        text("""
            SELECT id, tenant_id, conversation_id, total_duration_ms,
                   node_sequence, final_node, was_escalated, intent_detected,
                   lead_created, total_tokens, total_cost_usd, error,
                   langfuse_trace_id, created_at
            FROM agent_run_metrics
            WHERE created_at >= :cutoff
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {"cutoff": cutoff, "limit": limit, "offset": offset},
    )
    rows = result.fetchall()

    count_result = await db.execute(
        text("SELECT COUNT(*) FROM agent_run_metrics WHERE created_at >= :cutoff"),
        {"cutoff": cutoff},
    )
    total = count_result.scalar()

    return {
        "total": total,
        "items": [
            {
                "id": str(row.id),
                "tenant_id": row.tenant_id,
                "conversation_id": str(row.conversation_id) if row.conversation_id else None,
                "total_duration_ms": row.total_duration_ms,
                "node_sequence": row.node_sequence,
                "final_node": row.final_node,
                "was_escalated": row.was_escalated,
                "intent_detected": row.intent_detected,
                "lead_created": row.lead_created,
                "total_tokens": row.total_tokens,
                "total_cost_usd": round(float(row.total_cost_usd), 6),
                "error": row.error,
                "langfuse_trace_id": row.langfuse_trace_id,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
    }


@router.get("/agent/node-performance")
async def node_performance(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
):
    """Per-node avg/p50/p95 duration from LLM call latencies."""
    cutoff = _cutoff(hours)

    result = await db.execute(
        text("""
            SELECT
                node_name,
                COUNT(*) as calls,
                COALESCE(AVG(latency_ms), 0) as avg_ms,
                COALESCE(percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms), 0) as p50_ms,
                COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0) as p95_ms
            FROM llm_call_metrics
            WHERE created_at >= :cutoff
            GROUP BY node_name
            ORDER BY avg_ms DESC
        """),
        {"cutoff": cutoff},
    )
    rows = result.fetchall()

    return [
        {
            "node": row.node_name,
            "calls": row.calls,
            "avg_ms": round(float(row.avg_ms), 1),
            "p50_ms": round(float(row.p50_ms), 1),
            "p95_ms": round(float(row.p95_ms), 1),
        }
        for row in rows
    ]


@router.get("/agent/flow-distribution")
async def flow_distribution(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
):
    """Node sequence path counts."""
    cutoff = _cutoff(hours)

    result = await db.execute(
        text("""
            SELECT node_sequence, COUNT(*) as count
            FROM agent_run_metrics
            WHERE created_at >= :cutoff AND node_sequence IS NOT NULL
            GROUP BY node_sequence
            ORDER BY count DESC
            LIMIT 20
        """),
        {"cutoff": cutoff},
    )
    rows = result.fetchall()

    return [{"path": row.node_sequence, "count": row.count} for row in rows]


# ---------- RAG ----------


@router.get("/rag/quality")
async def rag_quality(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
):
    """RAG aggregate stats + timeseries."""
    cutoff = _cutoff(hours)

    # Aggregates
    agg_result = await db.execute(
        text(
            "SELECT COUNT(*) as total_retrievals,"
            " COALESCE(AVG(avg_similarity),0) as avg_similarity,"
            " COALESCE(AVG(CASE WHEN chunks_returned = 0"
            " THEN 1.0 ELSE 0.0 END)*100,0) as zero_result_rate,"
            " COALESCE(AVG(chunks_returned),0) as avg_chunks"
            " FROM rag_retrieval_metrics"
            " WHERE created_at >= :cutoff"
        ),
        {"cutoff": cutoff},
    )
    agg = agg_result.fetchone()

    # Timeseries
    ts_result = await db.execute(
        text("""
            SELECT
                date_trunc('hour', created_at) as bucket,
                COALESCE(AVG(avg_similarity), 0) as avg_sim,
                COALESCE(MIN(min_similarity), 0) as min_sim,
                COUNT(*) as retrievals
            FROM rag_retrieval_metrics
            WHERE created_at >= :cutoff AND avg_similarity IS NOT NULL
            GROUP BY bucket
            ORDER BY bucket
        """),
        {"cutoff": cutoff},
    )
    ts_rows = ts_result.fetchall()

    return {
        "total_retrievals": agg.total_retrievals,
        "avg_similarity": round(float(agg.avg_similarity), 4),
        "zero_result_rate": round(float(agg.zero_result_rate), 2),
        "avg_chunks": round(float(agg.avg_chunks), 1),
        "timeseries": [
            {
                "time": row.bucket.isoformat(),
                "avg_similarity": round(float(row.avg_sim), 4),
                "min_similarity": round(float(row.min_sim), 4),
                "retrievals": row.retrievals,
            }
            for row in ts_rows
        ],
    }


@router.get("/rag/retrievals")
async def rag_retrievals(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(50, ge=1, le=200),
):
    """Paginated RAG retrievals."""
    cutoff = _cutoff(hours)

    result = await db.execute(
        text("""
            SELECT id, tenant_id, query_text, chunks_returned,
                   chunks_above_threshold, avg_similarity, max_similarity,
                   min_similarity, embedding_latency_ms, search_latency_ms,
                   total_latency_ms, created_at
            FROM rag_retrieval_metrics
            WHERE created_at >= :cutoff
            ORDER BY created_at DESC
            LIMIT :limit
        """),
        {"cutoff": cutoff, "limit": limit},
    )
    rows = result.fetchall()

    return [
        {
            "id": str(row.id),
            "tenant_id": row.tenant_id,
            "query_text": row.query_text,
            "chunks_returned": row.chunks_returned,
            "chunks_above_threshold": row.chunks_above_threshold,
            "avg_similarity": round(float(row.avg_similarity), 4) if row.avg_similarity else None,
            "max_similarity": round(float(row.max_similarity), 4) if row.max_similarity else None,
            "min_similarity": round(float(row.min_similarity), 4) if row.min_similarity else None,
            "embedding_latency_ms": row.embedding_latency_ms,
            "search_latency_ms": row.search_latency_ms,
            "total_latency_ms": row.total_latency_ms,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


# ---------- Escalations ----------


@router.get("/escalations/analysis")
async def escalation_analysis(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
):
    """Escalation decision analysis."""
    cutoff = _cutoff(hours)

    # Method breakdown
    method_result = await db.execute(
        text("""
            SELECT
                detection_method,
                COUNT(*) as count,
                SUM(CASE WHEN should_escalate THEN 1 ELSE 0 END) as escalated
            FROM escalation_decision_metrics
            WHERE created_at >= :cutoff
            GROUP BY detection_method
        """),
        {"cutoff": cutoff},
    )
    method_rows = method_result.fetchall()

    # Reason distribution
    reason_result = await db.execute(
        text("""
            SELECT escalation_reason, COUNT(*) as count
            FROM escalation_decision_metrics
            WHERE created_at >= :cutoff AND should_escalate = true
            GROUP BY escalation_reason
            ORDER BY count DESC
        """),
        {"cutoff": cutoff},
    )
    reason_rows = reason_result.fetchall()

    # Pattern distribution
    pattern_result = await db.execute(
        text("""
            SELECT pattern_matched, COUNT(*) as count
            FROM escalation_decision_metrics
            WHERE created_at >= :cutoff AND pattern_matched IS NOT NULL
            GROUP BY pattern_matched
            ORDER BY count DESC
        """),
        {"cutoff": cutoff},
    )
    pattern_rows = pattern_result.fetchall()

    total_decisions = sum(r.count for r in method_rows)
    regex_triggers = sum(r.escalated for r in method_rows if r.detection_method == "regex")
    llm_triggers = sum(r.escalated for r in method_rows if r.detection_method == "llm")

    return {
        "total_decisions": total_decisions,
        "regex_triggers": regex_triggers,
        "llm_triggers": llm_triggers,
        "method_breakdown": [
            {
                "method": row.detection_method,
                "total": row.count,
                "escalated": row.escalated,
            }
            for row in method_rows
        ],
        "reason_distribution": [
            {"reason": row.escalation_reason or "none", "count": row.count}
            for row in reason_rows
        ],
        "pattern_distribution": [
            {"pattern": row.pattern_matched, "count": row.count}
            for row in pattern_rows
        ],
    }


# ---------- System ----------


@router.get("/system/events")
async def system_events(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
    severity: str = Query("all", pattern="^(all|info|warning|error|critical)$"),
    limit: int = Query(50, ge=1, le=200),
):
    """Paginated system events."""
    cutoff = _cutoff(hours)

    if severity != "all":
        sql = (
            "SELECT id, event_type, severity, source, message,"
            " stack_trace, extra_data, tenant_id, request_id,"
            " created_at FROM system_events"
            " WHERE created_at >= :cutoff"
            " AND severity = :severity"
            " ORDER BY created_at DESC LIMIT :limit"
        )
        params: dict = {
            "cutoff": cutoff, "severity": severity, "limit": limit,
        }
    else:
        sql = (
            "SELECT id, event_type, severity, source, message,"
            " stack_trace, extra_data, tenant_id, request_id,"
            " created_at FROM system_events"
            " WHERE created_at >= :cutoff"
            " ORDER BY created_at DESC LIMIT :limit"
        )
        params = {"cutoff": cutoff, "limit": limit}

    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    return [
        {
            "id": str(row.id),
            "event_type": row.event_type,
            "severity": row.severity,
            "source": row.source,
            "message": row.message,
            "stack_trace": row.stack_trace,
            "extra_data": row.extra_data,
            "tenant_id": row.tenant_id,
            "request_id": row.request_id,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.get("/system/error-timeseries")
async def error_timeseries(
    db: DbSession,
    hours: int = Query(24, ge=1, le=720),
    interval: str = Query("hour", pattern="^(hour|day)$"),
):
    """Error counts by time bucket."""
    cutoff = _cutoff(hours)
    trunc = "hour" if interval == "hour" else "day"

    result = await db.execute(
        text("""
            SELECT
                date_trunc(:trunc, created_at) as bucket,
                severity,
                COUNT(*) as count
            FROM system_events
            WHERE created_at >= :cutoff
            GROUP BY bucket, severity
            ORDER BY bucket
        """),
        {"cutoff": cutoff, "trunc": trunc},
    )
    rows = result.fetchall()

    # Group by bucket
    buckets: dict[str, dict] = {}
    for row in rows:
        key = row.bucket.isoformat()
        if key not in buckets:
            buckets[key] = {"time": key, "info": 0, "warning": 0, "error": 0, "critical": 0}
        buckets[key][row.severity] = row.count

    return list(buckets.values())
