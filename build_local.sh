#!/bin/bash

set -euo pipefail

# Local development build script
echo "🚀 Setting up OrthoRad for local development..."

# Set environment variable for local development
export ENVIRONMENT=development

# Make sure node/npm are reachable even when this script is launched from a
# shell that didn't load the usual profile (plain `bash` on macOS skips
# ~/.zshrc, where Homebrew/nvm normally set up PATH).
if ! command -v npm >/dev/null 2>&1; then
  [[ -d /opt/homebrew/bin ]] && export PATH="/opt/homebrew/bin:$PATH" # Homebrew (Apple Silicon)
  [[ -d /usr/local/bin ]] && export PATH="/usr/local/bin:$PATH"       # Homebrew (Intel) / system installs
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then                               # nvm
    set +ue
    source "$HOME/.nvm/nvm.sh" || true
    set -ue
  fi
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm not found on PATH. Install Node.js (e.g. 'brew install node'),"
  echo "   or run this script from the terminal you normally use for npm."
  exit 1
fi

# Ensure Python deps are installed
echo "🐍 Installing Python dependencies..."
python -m pip install -r backend/requirements.txt --quiet

# Sanity check: the Vite build reads the repo-root .env (see envDir in
# frontend/vite.config.ts) and only exposes VITE_-prefixed variables to
# the browser. Fail fast if the required ones are missing.
for var in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY; do
  if ! grep -q "^${var}=" .env 2>/dev/null; then
    echo "❌ Missing ${var} in .env — the frontend build would produce a broken app (supabaseUrl is required)."
    exit 1
  fi
done

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
