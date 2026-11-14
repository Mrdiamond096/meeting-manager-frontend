.DEFAULT_GOAL := help
COMPOSE := docker compose

help: ## Show targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n",$$1,$$2}'

install: ## npm install locally
	npm install
dev: ## Run Next.js dev server locally (:3001)
	npm run dev
test: ## Run tests locally
	npm test
up: ## Start web in docker
	$(COMPOSE) up -d --build
down: ## Stop containers
	$(COMPOSE) down
build: ## Build images
	$(COMPOSE) build
logs: ## Follow logs
	$(COMPOSE) logs -f
test-docker: ## Run tests inside container
	$(COMPOSE) run --rm web npm test
clean: ## Remove containers + volumes
	$(COMPOSE) down -v --remove-orphans

.PHONY: help install dev test up down build logs test-docker clean
