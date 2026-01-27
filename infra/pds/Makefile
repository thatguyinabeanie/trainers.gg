# trainers.gg PDS - Fly.io Deployment
# Common operations for managing the PDS

.PHONY: help setup deploy logs status ssh create-account certs health local-up local-down local-logs local-health local-url

# Default target
help:
	@echo "trainers.gg PDS - Available Commands"
	@echo ""
	@echo "NOTE: For local development, just run 'pnpm dev' from the repo root."
	@echo "      It automatically starts ngrok + PDS and updates env files."
	@echo ""
	@echo "Local Development (manual control):"
	@echo "  make local-up       - Start ngrok + local PDS"
	@echo "  make local-down     - Stop ngrok + local PDS"
	@echo "  make local-logs     - View local PDS logs"
	@echo "  make local-health   - Check local PDS health"
	@echo "  make local-url      - Show the current ngrok URL"
	@echo "  make local-status   - Show full status"
	@echo "  make local-account  - Create account on local PDS"
	@echo ""
	@echo "Production (Fly.io):"
	@echo "  make setup          - Initial setup (create app, volume, secrets, deploy)"
	@echo "  make deploy         - Deploy latest changes"
	@echo "  make logs           - Stream live logs"
	@echo "  make status         - Show app status"
	@echo "  make ssh            - SSH into the container"
	@echo "  make health         - Check PDS health endpoint"
	@echo "  make certs          - Show certificate status"
	@echo "  make certs-add      - Add SSL certificates"
	@echo "  make restart        - Restart the PDS"
	@echo "  make scale          - Scale to 1 machine (ensure running)"
	@echo ""
	@echo "Account Management:"
	@echo "  make create-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret"
	@echo ""

# ============================================
# LOCAL DEVELOPMENT (with ngrok)
# ============================================

# Start local PDS with ngrok (requires ngrok auth)
local-up:
	@./local-dev.sh start

# Stop local PDS and ngrok
local-down:
	@./local-dev.sh stop

# View local PDS logs
local-logs:
	@./local-dev.sh logs

# Check local PDS health
local-health:
	@NGROK_URL=$$(./local-dev.sh url 2>/dev/null) && \
		curl -s "$$NGROK_URL/xrpc/_health" | jq . || \
		echo "Local PDS not reachable - run 'make local-up' first"

# Show ngrok URL
local-url:
	@./local-dev.sh url

# Show full status
local-status:
	@./local-dev.sh status

# Create account on local PDS
# Usage: make local-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret
local-account:
ifndef HANDLE
	$(error HANDLE is required. Usage: make local-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret)
endif
ifndef EMAIL
	$(error EMAIL is required. Usage: make local-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret)
endif
ifndef PASSWORD
	$(error PASSWORD is required. Usage: make local-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret)
endif
	@NGROK_URL=$$(./local-dev.sh url 2>/dev/null) || (echo "Error: Local PDS not running. Run 'make local-up' first." && exit 1)
	@NGROK_HOSTNAME=$$(cat .ngrok-hostname 2>/dev/null)
	@echo "Creating invite code..."
	$(eval INVITE_CODE := $(shell curl -s -X POST \
		-H "Content-Type: application/json" \
		-H "Authorization: Basic $$(echo -n 'admin:localdevpassword' | base64)" \
		-d '{"useCount": 1}' \
		http://localhost:3001/xrpc/com.atproto.server.createInviteCode | jq -r '.code'))
	@echo "Invite code: $(INVITE_CODE)"
	@NGROK_HOSTNAME=$$(cat .ngrok-hostname) && \
		echo "Creating account $(HANDLE).$$NGROK_HOSTNAME..." && \
		curl -s -X POST \
			-H "Content-Type: application/json" \
			-d '{"email": "$(EMAIL)", "handle": "$(HANDLE).'"$$NGROK_HOSTNAME"'", "password": "$(PASSWORD)", "inviteCode": "$(INVITE_CODE)"}' \
			http://localhost:3001/xrpc/com.atproto.server.createAccount | jq .

# ============================================
# PRODUCTION (FLY.IO)
# ============================================

# Initial setup - runs the full setup script
setup:
	./setup.sh

# Deploy changes
deploy:
	fly deploy --app trainers-pds

# View logs
logs:
	fly logs --app trainers-pds

# Check status
status:
	fly status --app trainers-pds

# SSH into container
ssh:
	fly ssh console --app trainers-pds

# Health check
health:
	@curl -s https://pds.trainers.gg/xrpc/_health | jq . || echo "PDS not reachable - check deployment"

# Show certificate status
certs:
	fly certs list --app trainers-pds

# Add SSL certificates
certs-add:
	fly certs add pds.trainers.gg --app trainers-pds
	fly certs add "*.trainers.gg" --app trainers-pds

# Restart the PDS
restart:
	fly machine restart --app trainers-pds

# Scale to ensure at least 1 machine running
scale:
	fly scale count 1 --app trainers-pds

# Create a new account
# Usage: make create-account HANDLE=username EMAIL=user@example.com PASSWORD=secret
create-account:
ifndef PDS_ADMIN_PASSWORD
	$(error PDS_ADMIN_PASSWORD is required. Export it first: export PDS_ADMIN_PASSWORD=<password>)
endif
ifndef HANDLE
	$(error HANDLE is required. Usage: make create-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret)
endif
ifndef EMAIL
	$(error EMAIL is required. Usage: make create-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret)
endif
ifndef PASSWORD
	$(error PASSWORD is required. Usage: make create-account HANDLE=ash EMAIL=ash@example.com PASSWORD=secret)
endif
	./create-account.sh $(HANDLE) $(EMAIL) $(PASSWORD)

# View volume info
volume:
	fly volumes list --app trainers-pds

# Create a volume snapshot (backup)
backup:
	@echo "Creating volume snapshot..."
	fly volumes snapshots create $$(fly volumes list --app trainers-pds --json | jq -r '.[0].id')
	@echo "Snapshot created. List with: fly volumes snapshots list <volume-id>"

# Show secrets (names only, not values)
secrets:
	fly secrets list --app trainers-pds
