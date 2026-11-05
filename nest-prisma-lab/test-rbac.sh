#!/usr/bin/env bash
# RBAC test script for ITCS258 Lab 07.
#
# Usage: ./test-rbac.sh
# Assumes the server is already running at http://localhost:3000
# (npm run start, in a separate terminal).
#
# What it does:
#   1. Registers a USER account and a soon-to-be-ADMIN account.
#   2. Promotes the second account to ADMIN directly in the database
#      (via scripts/promote-admin.ts) - registration itself can never
#      grant ADMIN, by design.
#   3. Logs in both accounts to get JWTs and confirms each token's
#      "role" claim.
#   4. Hits the room-management endpoints with each token and checks
#      that the HTTP status code matches what RBAC should allow.

set -uo pipefail

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

# Unique usernames per run so re-running the script doesn't collide
# with "username already taken".
SUFFIX=$(date +%s)
USER_NAME="test_user_${SUFFIX}"
ADMIN_NAME="test_admin_${SUFFIX}"
PASSWORD="password123"

check() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $description (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $description (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "== Setup =="

curl -s -o /dev/null -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER_NAME\",\"password\":\"$PASSWORD\"}"
echo "Registered USER account: $USER_NAME"

curl -s -o /dev/null -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_NAME\",\"password\":\"$PASSWORD\"}"
echo "Registered account to promote: $ADMIN_NAME"

# Registration always creates a USER; promote to ADMIN out-of-band,
# the same way a real ops team would provision an admin account.
if [ ! -f dist/scripts/promote-admin.js ]; then
  echo "Building project (dist/scripts/promote-admin.js not found)..."
  npm run build > /dev/null
fi
node dist/scripts/promote-admin.js "$ADMIN_NAME"

USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER_NAME\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_NAME\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo
echo "USER token role claim:"
echo "$USER_TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null; echo
echo "ADMIN token role claim:"
echo "$ADMIN_TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null; echo

echo
echo "== RBAC checks =="

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"name":"RBAC Test Room","capacity":2,"price_per_night":100}')
check "No token -> POST /rooms" 401 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Authorization: Bearer $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"RBAC Test Room","capacity":2,"price_per_night":100}')
check "USER -> POST /rooms" 403 "$CODE"

RESP=$(curl -s -X POST "$BASE_URL/rooms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"RBAC Test Room","capacity":2,"price_per_night":100}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"RBAC Test Room 2","capacity":2,"price_per_night":100}')
check "ADMIN -> POST /rooms" 201 "$CODE"
ROOM_ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "  (using room id=$ROOM_ID for the rest of the checks)"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"capacity":4}')
check "USER -> PATCH /rooms/:id" 403 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"capacity":4}')
check "ADMIN -> PATCH /rooms/:id" 200 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/rooms/$ROOM_ID/disable" \
  -H "Authorization: Bearer $USER_TOKEN")
check "USER -> PATCH /rooms/:id/disable" 403 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/rooms/$ROOM_ID/disable" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "ADMIN -> PATCH /rooms/:id/disable" 200 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
check "USER -> DELETE /rooms/:id" 403 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "ADMIN -> DELETE /rooms/:id" 200 "$CODE"

echo
echo "== Results: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
