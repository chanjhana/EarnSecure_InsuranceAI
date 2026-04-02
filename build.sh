#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[build] Installing frontend dependencies"
npm ci

echo "[build] Type-checking frontend"
npm run typecheck

echo "[build] Running frontend tests"
npm run test:ci

if command -v conda >/dev/null 2>&1; then
  echo "[build] Running backend integration tests via conda env"
  if conda env list | grep -q "earnsecure-backend"; then
    conda run -n earnsecure-backend python -m pip install -r backend/requirements-dev.txt
    conda run -n earnsecure-backend python -m pytest backend/tests -q
  else
    echo "[build] Conda env earnsecure-backend not found; creating it"
    conda create -y -n earnsecure-backend python=3.11
    conda run -n earnsecure-backend python -m pip install -r backend/requirements-dev.txt
    conda run -n earnsecure-backend python -m pytest backend/tests -q
  fi
else
  echo "[build] Conda not found; falling back to system python for backend tests"
  python3 -m pip install -r backend/requirements-dev.txt
  python3 -m pytest backend/tests -q
fi

echo "[build] Build and test checks passed"
