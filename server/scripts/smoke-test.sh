#!/bin/bash

# Smoke Test Script for IdeaSpark API
# Usage: ./smoke-test.sh <API_URL>
# Example: ./smoke-test.sh https://api.ideaspark.app

set -e

API_URL="${1:-http://localhost:3000}"
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running smoke tests against: $API_URL"
echo "============================================"

# Test function
test_endpoint() {
  local name="$1"
  local endpoint="$2"
  local expected_status="${3:-200}"
  local method="${4:-GET}"

  echo -n "Testing $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" -H "Content-Type: application/json")
  fi

  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Health checks
echo ""
echo "📊 Health Checks"
echo "----------------"
test_endpoint "Basic Health Check" "/health" 200
test_endpoint "Detailed Health Check" "/health/detailed" 200
test_endpoint "Readiness Probe" "/health/ready" 200
test_endpoint "Liveness Probe" "/health/live" 200

# API info
echo ""
echo "ℹ️  API Info"
echo "------------"
test_endpoint "Root Endpoint" "/" 200
test_endpoint "API Version Info" "/api/v1" 200

# Auth endpoints (should return validation errors without body)
echo ""
echo "🔐 Auth Endpoints"
echo "-----------------"
test_endpoint "Register Endpoint" "/api/v1/auth/register" 400 POST
test_endpoint "Login Endpoint" "/api/v1/auth/login" 400 POST

# Protected endpoints (should return 401 without auth)
echo ""
echo "🔒 Protected Endpoints"
echo "----------------------"
test_endpoint "Ideas Endpoint (Protected)" "/api/v1/ideas" 401
test_endpoint "Users Endpoint (Protected)" "/api/v1/users/me" 401
test_endpoint "Notifications Endpoint (Protected)" "/api/v1/notifications" 401

# Summary
echo ""
echo "============================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAILED test(s) failed${NC}"
  exit 1
fi
