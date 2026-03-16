#!/bin/bash
#
# Scan 10 DACH domains via the batch scanner API
#
# Usage:
#   LOCAL:  ./scripts/scan-dach-batch.sh http://localhost:3000
#   PROD:   ./scripts/scan-dach-batch.sh https://ghost-tax.com
#
# Requires CRON_SECRET env var (or edit below)

BASE_URL="${1:-http://localhost:3000}"
SECRET="${CRON_SECRET:-your-cron-secret-here}"

echo "╔══════════════════════════════════════════════════╗"
echo "║  GHOST TAX — Batch Domain Scanner (10 DACH)     ║"
echo "║  Target: $BASE_URL                              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

curl -s -X POST "$BASE_URL/api/scan/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "'"$SECRET"'",
    "domains": [
      "billie.io",
      "getpliant.com",
      "sennder.com",
      "circula.com",
      "upvest.co",
      "razor-group.com",
      "taxfix.de",
      "getmoss.com",
      "reev.com",
      "staffbase.com"
    ]
  }' | python3 -m json.tool 2>/dev/null || echo "(raw output above)"

echo ""
echo "Done."
