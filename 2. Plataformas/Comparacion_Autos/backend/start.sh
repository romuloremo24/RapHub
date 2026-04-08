#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  RadarAuto - Backend"
echo "============================================"

python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r requirements.txt -q
echo "[OK] Abriendo http://localhost:8000 ..."
sleep 2 && (open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null || true) &
python main.py
