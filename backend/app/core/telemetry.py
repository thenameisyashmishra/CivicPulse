"""
OpenTelemetry APM & Distributed Tracing Instrumentation for CivicPulse.

Features:
- Microsecond query and HTTP request distributed tracing.
- Fast, non-blocking telemetry exporters (OTLP gRPC in production, Console in dev).
- Graceful degradation when OpenTelemetry packages are not installed.
"""

import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def setup_telemetry(app: Any = None) -> bool:
    """Initializes OpenTelemetry distributed tracing across FastAPI, SQLAlchemy, and Redis."""
    if not settings.opentelemetry_enabled:
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

        resource = Resource.create({
            "service.name": settings.app_name,
            "service.env": settings.app_env,
            "service.version": "1.0.0",
        })
        provider = TracerProvider(resource=resource)

        # In production with OTLP endpoint configured, use OTLP gRPC/HTTP exporter
        exporter = None
        if settings.opentelemetry_endpoint and settings.app_env == "production":
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
                exporter = OTLPSpanExporter(endpoint=settings.opentelemetry_endpoint)
                logger.info("Configured OTLP gRPC span exporter to %s", settings.opentelemetry_endpoint)
            except Exception as exp_err:
                logger.warning("Could not instantiate OTLPSpanExporter: %s. Using console fallback.", exp_err)

        if exporter is None:
            exporter = ConsoleSpanExporter()

        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)

        if app:
            FastAPIInstrumentor.instrument_app(app)

        from app.db.database import engine

        SQLAlchemyInstrumentor().instrument(engine=engine)
        RedisInstrumentor().instrument()

        logger.info("OpenTelemetry distributed tracing successfully initialized.")
        return True
    except Exception as e:
        logger.warning(f"Could not initialize OpenTelemetry: {e}. Operating without distributed APM.")
        return False
