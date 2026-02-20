SCRIPT_DIR  := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
REPO_ROOT   := $(abspath $(SCRIPT_DIR)../..)
ENV_FILE    := $(REPO_ROOT)/.env.local
COMPOSE     := docker compose --env-file $(ENV_FILE) -f $(SCRIPT_DIR)docker-compose.yml

.PHONY: up down reset logs

up:
	$(COMPOSE) up -d
	@echo "🎨 Penpot: http://localhost:9001 | Email: http://localhost:1080"

down:
	$(COMPOSE) down

reset:
	$(COMPOSE) down -v
	@echo "✅ Volumes cleared — fresh DB on next start"

logs:
	$(COMPOSE) logs -f
