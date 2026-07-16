#!/bin/bash

set -euo pipefail

# Production build script — EXAMPLE ONLY, revisit before real deployment.
echo "🚀 Setting up OrthoRad for production..."

# Set environment variable for production
export ENVIRONMENT=production
export DJANGO_SETTINGS_MODULE=config.settings.prod

# Build the React app for production
echo "📦 Building React frontend for production..."
cd frontend
npm install --no-audit --no-fund
npm run build
cd ..

# Run Django collectstatic to gather all static files
echo "🗂️ Running Django collectstatic..."
cd backend
python manage.py collectstatic --noinput
cd ..

echo "✅ Production build complete!"
echo "This is a starter script — deployment target (Docker/VM/PaaS) is still TBD."
