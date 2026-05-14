#!/usr/bin/env bash
# check-env.sh — Validates required environment variables before server startup.
# Usage: ./scripts/check-env.sh
# Exit code 1 if any required variable is missing.

set -euo pipefail

REQUIRED_VARS=(
  NODE_ENV
  PORT
  DATABASE_URL
  REDIS_URL
  JWT_SECRET
  STELLAR_NETWORK
  STELLAR_CONTRACT_ADDRESS
  STELLAR_HORIZON_URL
  CORS_ALLOWED_ORIGINS
)

missing=()

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "ERROR: The following required environment variables are not set:"
  for v in "${missing[@]}"; do
    echo "  - $v"
  done
  exit 1
fi

echo "✅ All required environment variables are set."
