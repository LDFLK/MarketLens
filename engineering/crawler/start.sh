#!/bin/sh
set -e

echo "Starting manual upload API..."
uvicorn manual_upload.api:app --host 0.0.0.0 --port 8000 &

echo "Starting crawler scheduler..."
python main.py