#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Automated Acceptance Test Runner
# ==============================================================================

set -e

echo "=== Running 30-Step Acceptance Test Suite ==="

cd "$(dirname "$0")/../backend"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing backend test dependencies..."
    npm install
fi

# Run acceptance tests with ts-node
echo "Executing test assertions..."
npx ts-node src/tests/acceptance.test.ts

echo "=== All Acceptance Tests Passed Successfully! ==="
