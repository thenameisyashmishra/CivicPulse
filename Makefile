.PHONY: install seed dev backend frontend clean test lint docker-up docker-down help

help:
	@echo "CivicPulse Development Commands:"
	@echo "  make install      - Install frontend & backend local dependencies"
	@echo "  make seed         - Initialize SQLite database & seed demo accounts"
	@echo "  make dev          - Run both servers concurrently"
	@echo "  make backend      - Run FastAPI dev server (port 8000)"
	@echo "  make frontend     - Run Vite dev server (port 3000)"
	@echo "  make test         - Run python unit/smoke tests"
	@echo "  make lint         - Run python linter and formatter"
	@echo "  make clean        - Delete build artifacts, caches, and DB files"
	@echo "  make docker-up    - Spin up local development containers via docker-compose"
	@echo "  make docker-down  - Shut down running docker containers"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

seed:
	cd backend && python -m app.db.seed

backend:
	cd backend && python -m uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	npx concurrently --kill-others \
		"cd backend && python -m uvicorn app.main:app --reload --port 8000" \
		"cd frontend && npm run dev"

test:
	cd backend && python -m pytest tests/

lint:
	cd backend && ruff check . && ruff format --check .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/.pytest_cache
	rm -rf backend/civicpulse.db

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down -v
