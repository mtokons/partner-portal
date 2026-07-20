#!/bin/sh
set -e
# Build the starter DOCX templates if they don't already exist
python /app/create_templates.py
# Build the Custom CV Format 1 placeholder template
python /app/build_custom1.py
# Start the API server
exec uvicorn main:app --host 0.0.0.0 --port 8001
