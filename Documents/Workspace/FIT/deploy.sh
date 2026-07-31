#!/bin/bash
set -e

echo "=== FIT Deployment ==="

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in values."
  echo "  cp .env.example .env"
  exit 1
fi

# Pull latest
echo ">> Pulling latest code..."
git pull origin feature/automation-dashboard

# Build & start
echo ">> Building and starting containers..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Done ==="
echo "  Frontend : http://$(grep VM_HOST .env | cut -d= -f2 || echo localhost):3000"
echo "  API      : http://$(grep VM_HOST .env | cut -d= -f2 || echo localhost):5000"
echo ""
echo "Logs: docker compose logs -f"
