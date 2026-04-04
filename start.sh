#!/usr/bin/env bash
# ─────────────────────────────────────────
# ASM RBAC Quick-Start Script
# Usage: bash start.sh
# ─────────────────────────────────────────
set -e

echo ""
echo "===================================="
echo "  ASM RBAC — Quick Start"
echo "===================================="
echo ""

# ── Check Node ──────────────────────────
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "Node.js: $(node -v)"

# ── Backend ─────────────────────────────
echo ""
echo "[1/3] Installing backend packages..."
cd backend
npm install --silent

echo "[2/3] Seeding demo users (first run only)..."
node seed.js || echo "Seed skipped (users may already exist)"

echo "[3/3] Starting backend server..."
npm start &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 2

# ── Frontend ────────────────────────────
cd ../frontend
echo ""
echo "Installing frontend packages..."
npm install --silent

echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "===================================="
echo "  App running at: http://localhost:5173"
echo "  Admin:    admin@ajanthasilk.com / Admin@123"
echo "  Employee: employee@ajanthasilk.com / Admin@123"
echo "===================================="
echo ""
echo "Press Ctrl+C to stop both servers."

wait $BACKEND_PID $FRONTEND_PID
