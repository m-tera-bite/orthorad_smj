#!/bin/bash

set -euo pipefail

# Local development build script
echo "🚀 Setting up OrthoRad for local development..."

# Initialize conda for Git Bash on Windows (if running on Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "mingw"* ]]; then
  echo "🪟 Detected Windows Git Bash, initializing conda..."
  source /c/ProgramData/anaconda3/etc/profile.d/conda.sh 2>/dev/null || \
    source "$HOME/anaconda3/etc/profile.d/conda.sh" 2>/dev/null || \
    source "/c/Users/$USER/anaconda3/etc/profile.d/conda.sh" 2>/dev/null || true
  conda activate orthorad 2>/dev/null || true

  # Add Node.js to PATH if not already there
  export PATH="$PATH:/c/Program Files/nodejs"
fi

# Set environment variable for local development
export ENVIRONMENT=development

# Ensure Python deps are installed
echo "🐍 Installing Python dependencies..."
python -m pip install -r backend/requirements.txt --quiet

# Build the React app (outputs to backend/static/react, see frontend/vite.config.ts)
echo "📦 Building React frontend..."
cd frontend
npm install --no-audit --no-fund --silent
npm run build
cd ..

# Clear any existing Django server processes
echo "🔄 Stopping any existing Django server..."
pkill -f "manage.py runserver" >/dev/null 2>&1 || true

# Start Django development server
echo "🌐 Starting Django development server..."
echo "Visit http://127.0.0.1:8000 to access the application"
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
python manage.py runserver
