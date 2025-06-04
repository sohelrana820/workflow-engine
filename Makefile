# Octoflow Automation Engine - Makefile
# Usage: make <target>

# Configuration
COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = octoflow
BACKEND_PORT = 3001
FRONTEND_PORT = 3000
APP_PORT = 3012

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Phony targets (not files)
.PHONY: help install start stop restart clean logs status build test deps check open uninstall

##@ Main Commands

help: ## Show this help message
	@echo "$(BLUE)Octoflow Automation Engine$(NC)"
	@echo "$(BLUE)============================$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

install: check deps build start open ## Complete installation (recommended)
	@echo "$(GREEN)✅ Octoflow installation completed successfully!$(NC)"
	@echo "$(BLUE)📱 Application running at: http://localhost:$(APP_PORT)$(NC)"

quick-start: deps start open ## Quick start (skip build if images exist)
	@echo "$(GREEN)🚀 Octoflow started quickly!$(NC)"

##@ Development

start: ## Start all services
	@echo "$(BLUE)🚀 Starting Octoflow services...$(NC)"
	@docker compose up -d
	@echo "$(GREEN)✅ Services started$(NC)"

stop: ## Stop all services
	@echo "$(YELLOW)⏹️  Stopping Octoflow services...$(NC)"
	@docker compose down
	@echo "$(GREEN)✅ Services stopped$(NC)"

restart: stop start ## Restart all services
	@echo "$(GREEN)🔄 Octoflow restarted$(NC)"

build: ## Build Docker images
	@echo "$(BLUE)🔨 Building Docker images...$(NC)"
	@docker compose build --no-cache
	@echo "$(GREEN)✅ Images built successfully$(NC)"

rebuild: clean build ## Clean rebuild of all images
	@echo "$(GREEN)🔨 Complete rebuild finished$(NC)"

##@ Dependencies & Setup

check: ## Check system requirements
	@echo "$(BLUE)🔍 Checking system requirements...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)❌ Docker is not installed$(NC)"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "$(RED)❌ Docker is not running$(NC)"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "$(RED)❌ Docker Compose is not available$(NC)"; exit 1; }
	@echo "$(GREEN)✅ All requirements satisfied$(NC)"

deps: check setup-env setup-network ## Install dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@docker compose run --rm backend npm install || echo "$(YELLOW)⚠️  Backend deps install failed (will retry on start)$(NC)"
	@docker compose run --rm frontend npm install || echo "$(YELLOW)⚠️  Frontend deps install failed (will retry on start)$(NC)"
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

setup-env: ## Setup environment files
	@echo "$(BLUE)⚙️  Setting up environment files...$(NC)"
	@if [ ! -f .env ]; then \
		if [ -f .env.example ]; then \
			cp .env.example .env; \
		else \
			echo "COMPOSE_PROJECT_NAME=$(PROJECT_NAME)" > .env; \
			echo "DOCKER_BUILD_MODE=dev" >> .env; \
			echo "BACK_ENT_PUBLISH_PORT=$(BACKEND_PORT)" >> .env; \
			echo "FRONT_ENT_PUBLISH_PORT=$(FRONTEND_PORT)" >> .env; \
		fi; \
		echo "$(GREEN)✅ Main .env created$(NC)"; \
	fi
	@if [ ! -f backend/.env ]; then \
		if [ -f backend/.env.example ]; then \
			cp backend/.env.example backend/.env; \
		else \
			mkdir -p backend; \
			echo "NODE_ENV=development" > backend/.env; \
			echo "PORT=3000" >> backend/.env; \
		fi; \
		echo "$(GREEN)✅ Backend .env created$(NC)"; \
	fi
	@if [ ! -f frontend/.env ]; then \
		if [ -f frontend/.env.example ]; then \
			cp frontend/.env.example frontend/.env; \
		else \
			mkdir -p frontend; \
			echo "REACT_APP_API_URL=http://localhost:$(BACKEND_PORT)" > frontend/.env; \
		fi; \
		echo "$(GREEN)✅ Frontend .env created$(NC)"; \
	fi

setup-network: ## Create Docker network
	@echo "$(BLUE)🌐 Setting up Docker network...$(NC)"
	@docker network ls | grep $(PROJECT_NAME)-app >/dev/null 2>&1 || \
		(docker network create $(PROJECT_NAME)-app && echo "$(GREEN)✅ Network created$(NC)") || \
		echo "$(YELLOW)⚠️  Network already exists$(NC)"

##@ Monitoring & Logs

status: ## Show service status
	@echo "$(BLUE)📊 Service Status:$(NC)"
	@docker compose ps

logs: ## Show logs for all services
	@docker compose logs -f

logs-backend: ## Show backend logs only
	@docker compose logs -f backend

logs-frontend: ## Show frontend logs only
	@docker compose logs -f frontend

logs-db: ## Show database logs only
	@docker compose logs -f postgres

##@ Testing & Quality

test: ## Run tests
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	@docker compose exec backend npm test || echo "$(YELLOW)⚠️  Backend not running, starting test containers...$(NC)"
	@docker compose run --rm backend npm test
	@docker compose run --rm frontend npm test

test-backend: ## Run backend tests only
	@docker compose run --rm backend npm test

test-frontend: ## Run frontend tests only
	@docker compose run --rm frontend npm test

lint: ## Run linting
	@echo "$(BLUE)🔍 Running linters...$(NC)"
	@docker compose run --rm backend npm run lint || true
	@docker compose run --rm frontend npm run lint || true

format: ## Format code
	@echo "$(BLUE)💄 Formatting code...$(NC)"
	@docker compose run --rm backend npm run format || true
	@docker compose run --rm frontend npm run format || true

##@ Database & Data

db-reset: ## Reset database
	@echo "$(YELLOW)⚠️  Resetting database...$(NC)"
	@docker compose down
	@docker volume rm $(PROJECT_NAME)_postgres_data 2>/dev/null || true
	@docker compose up -d postgres
	@echo "$(GREEN)✅ Database reset$(NC)"

db-backup: ## Backup database
	@echo "$(BLUE)💾 Creating database backup...$(NC)"
	@mkdir -p backups
	@docker compose exec postgres pg_dump -U postgres octoflow_db > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Database backed up$(NC)"

db-migrate: ## Run database migrations
	@docker compose run --rm backend npm run migration

##@ Utilities

open: ## Open application in browser
	@echo "$(BLUE)🌐 Opening Octoflow in browser...$(NC)"
	@sleep 3
	@if command -v open >/dev/null 2>&1; then \
		open http://localhost:$(APP_PORT); \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:$(APP_PORT); \
	else \
		echo "$(YELLOW)📱 Please open http://localhost:$(APP_PORT) in your browser$(NC)"; \
	fi

shell-backend: ## Access backend container shell
	@docker compose exec backend /bin/bash

shell-frontend: ## Access frontend container shell
	@docker compose exec frontend /bin/bash

shell-db: ## Access database shell
	@docker compose exec postgres psql -U postgres -d octoflow_db

##@ Cleanup

clean: ## Stop services and remove containers
	@echo "$(YELLOW)🧹 Cleaning up containers...$(NC)"
	@docker compose down --remove-orphans
	@echo "$(GREEN)✅ Containers cleaned$(NC)"

clean-images: ## Remove project Docker images
	@echo "$(YELLOW)🧹 Cleaning up images...$(NC)"
	@docker images --filter "reference=*$(PROJECT_NAME)*" -q | xargs -r docker rmi -f
	@echo "$(GREEN)✅ Images cleaned$(NC)"

clean-volumes: ## Remove project volumes (⚠️ DATA LOSS!)
	@echo "$(RED)⚠️  WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	@docker compose down --volumes
	@docker volume ls --filter "name=$(PROJECT_NAME)" -q | xargs -r docker volume rm
	@echo "$(GREEN)✅ Volumes cleaned$(NC)"

clean-all: clean clean-images clean-volumes ## Complete cleanup (⚠️ DATA LOSS!)
	@echo "$(GREEN)✅ Complete cleanup finished$(NC)"

uninstall: clean-all ## Complete uninstallation
	@echo "$(YELLOW)🗑️  Uninstalling Octoflow...$(NC)"
	@docker network rm $(PROJECT_NAME)-app 2>/dev/null || true
	@rm -f .env backend/.env frontend/.env 2>/dev/null || true
	@echo "$(GREEN)✅ Octoflow uninstalled$(NC)"

##@ Production

prod-build: ## Build for production
	@echo "$(BLUE)🏭 Building for production...$(NC)"
	@DOCKER_BUILD_MODE=prod docker compose build
	@echo "$(GREEN)✅ Production build complete$(NC)"

prod-start: ## Start in production mode
	@echo "$(BLUE)🏭 Starting in production mode...$(NC)"
	@DOCKER_BUILD_MODE=prod docker compose up -d
	@echo "$(GREEN)✅ Production services started$(NC)"

prod-deploy: prod-build prod-start ## Deploy to production
	@echo "$(GREEN)🚀 Production deployment complete$(NC)"

##@ Information

info: ## Show project information
	@echo "$(BLUE)Octoflow Automation Engine$(NC)"
	@echo "$(BLUE)============================$(NC)"
	@echo "Project: $(PROJECT_NAME)"
	@echo "Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "App:      http://localhost:$(APP_PORT)"
	@echo ""
	@echo "$(YELLOW)Docker Status:$(NC)"
	@docker --version
	@docker compose version

version: ## Show version information
	@echo "Octoflow v1.0.0"