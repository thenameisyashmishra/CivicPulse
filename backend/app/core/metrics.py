"""
Prometheus Metrics Exposition Router for CivicPulse.

Tracks:
- Total HTTP request volume & status code distribution
- API request duration histograms across endpoints
- AI verification pipeline processing durations & verdict distributions
- Active WebSocket connections gauge
- Database connection pool utilization gauge
- Evidence submission rates
"""

import logging
from fastapi import APIRouter, Response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["metrics"])

# Optional Prometheus Client Import with graceful stubbing
try:
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        Counter,
        Gauge,
        Histogram,
        generate_latest,
    )

    PROMETHEUS_AVAILABLE = True

    # 1. HTTP Request Metrics
    http_requests_total = Counter(
        "civicpulse_http_requests_total",
        "Total HTTP requests received",
        ["method", "endpoint", "status_code"],
    )
    request_duration_seconds = Histogram(
        "civicpulse_request_duration_seconds",
        "HTTP request latency in seconds",
        ["method", "endpoint"],
        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
    )

    # 2. Domain & AI Verification Metrics
    evidence_uploads_total = Counter(
        "civicpulse_evidence_uploads_total",
        "Total evidence images uploaded",
        ["status"],
    )
    ai_verifications_total = Counter(
        "civicpulse_ai_verifications_total",
        "AI vision analysis verification outcomes",
        ["verdict", "engine"],  # verdict: verified, review, failed; engine: gemini, opencv_heuristic
    )
    ai_pipeline_duration_seconds = Histogram(
        "civicpulse_ai_pipeline_duration_seconds",
        "Duration of the deep vision AI analysis pipeline in seconds",
        buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0),
    )
    citizen_votes_total = Counter(
        "civicpulse_citizen_votes_total",
        "Total citizen validation votes cast",
        ["choice"],
    )

    # 3. Connection & Resource Gauges
    active_websocket_connections = Gauge(
        "civicpulse_active_websocket_connections",
        "Current number of active real-time WebSocket connections",
    )
    db_pool_utilization = Gauge(
        "civicpulse_db_pool_utilization_ratio",
        "Ratio of active database connections in the engine pool (0.0 - 1.0)",
    )

except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("prometheus_client package not installed. Metric collection will be stubbed.")


@router.get("/metrics")
def metrics():
    """Prometheus exposition endpoint for scraping by Prometheus or OpenTelemetry Collector."""
    if not PROMETHEUS_AVAILABLE:
        return Response(
            content="# HELP civicpulse_metrics Prometheus client not installed\n# TYPE civicpulse_metrics gauge\ncivicpulse_installed 0\n",
            media_type="text/plain; version=0.0.4",
        )
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
