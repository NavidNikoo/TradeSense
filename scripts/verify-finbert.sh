#!/usr/bin/env bash
#
# verify-finbert.sh
#
# Pings the deployed FinBERT proxy with three known-bias headlines and
# reports whether live FinBERT scoring is working in production.
#
# Usage:
#   ./scripts/verify-finbert.sh                 # uses default live URL
#   ./scripts/verify-finbert.sh https://my.app  # check a different host
#
# Exit codes:
#   0  live + classifications look sane
#   1  endpoint reachable but returned wrong shape / unexpected labels
#   2  endpoint unreachable or non-200

set -u

BASE_URL="${1:-https://tradesense-3101b.web.app}"
ENDPOINT="${BASE_URL%/}/api/finbert"

echo "→ Verifying FinBERT proxy at: ${ENDPOINT}"
echo

PAYLOAD='{"inputs":[
  "Tesla beats Q4 earnings expectations and raises guidance",
  "Federal Reserve signals it may cut rates due to slowing growth",
  "Major bank announces unexpected loan loss provisions and layoffs"
]}'

RESPONSE_FILE="$(mktemp)"
HTTP_CODE="$(curl -s -o "$RESPONSE_FILE" -w '%{http_code}' \
  -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")"

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ HTTP $HTTP_CODE from $ENDPOINT"
  echo "  Body:"
  sed 's/^/    /' "$RESPONSE_FILE"
  rm -f "$RESPONSE_FILE"
  if [ "$HTTP_CODE" = "503" ]; then
    echo
    echo "  → 503 means the server has no HUGGINGFACE_API_KEY secret."
    echo "    Fix: firebase functions:secrets:set HUGGINGFACE_API_KEY"
    echo "         firebase deploy --only functions"
  fi
  exit 2
fi

BODY="$(cat "$RESPONSE_FILE")"
rm -f "$RESPONSE_FILE"

echo "✓ HTTP 200"
echo "  Raw response:"
echo "    $BODY"
echo

# Sanity check expected labels (positive, negative, negative)
EXPECTED_PATTERN='"label":"positive".*"label":"negative".*"label":"negative"'
if echo "$BODY" | grep -Eq "$EXPECTED_PATTERN"; then
  echo "✓ Labels match expected sentiment direction (positive, negative, negative)"
  echo "✓ Live FinBERT scoring is working in production."
  exit 0
else
  echo "⚠  Endpoint returned 200 but label sequence didn't match expected pattern."
  echo "   This may still be live — FinBERT can occasionally disagree on borderline phrasing."
  exit 1
fi
