# Multi-stage Python build for production efficiency
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final runner stage
FROM python:3.12-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user
RUN groupadd -r appuser && useradd -r -g appuser -d /home/appuser -m appuser

# Copy installed dependencies and project files to appuser
COPY --chown=appuser:appuser --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .

ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONPATH=/app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/live')" || exit 1

# Seed database and start FastAPI server
CMD ["sh", "-c", "python -m app.db.seed && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
