# trainers.gg PDS - Fly.io Deployment
# Common operations for managing the PDS

.PHONY: help setup deploy logs status ssh create-account certs health

# Default target
help:
	@echo "trainers.gg PDS - Available Commands"
	@echo ""
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
