.PHONY: help start stop restart logs clean db-up db-down db-reset db-migrate db-seed dev build test

# Default target
help:
	@echo "Available commands:"
	@echo "  make start        - Start all Docker services"
	@echo "  make stop         - Stop all Docker services"
	@echo "  make restart      - Restart all Docker services"
	@echo "  make logs         - View Docker logs"
	@echo "  make clean        - Remove all Docker volumes and containers"
	@echo "  make db-up        - Start database services"
	@echo "  make db-down      - Stop database services"
	@echo "  make db-reset     - Reset database (drop and recreate)"
	@echo "  make db-migrate   - Run Prisma migrations"
	@echo "  make db-seed      - Seed the database"
	@echo "  make dev          - Start development server"
	@echo "  make build        - Build TypeScript code"
	@echo "  make test         - Run tests"

# Docker commands
start:
	docker-compose up -d

stop:
	docker-compose down

restart: stop start

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	rm -rf dist coverage

# Database commands
db-up:
	docker-compose up -d postgres redis

db-down:
	docker-compose stop postgres redis

db-reset:
	docker-compose down postgres
	docker volume rm server_postgres_data || true
	docker-compose up -d postgres
	sleep 5
	npm run prisma:migrate

db-migrate:
	npm run prisma:migrate

db-seed:
	npm run prisma:seed

# Development commands
dev:
	npm run dev

build:
	npm run build

test:
	npm test

# Production commands
prod-build:
	docker build -t ideaspark-server .

prod-run:
	docker run -p 3000:3000 --env-file .env ideaspark-server